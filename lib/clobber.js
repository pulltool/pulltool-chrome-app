/* global Blob chrome clobber:true */
var clobber = {};
(function(){
function createDir(baseDir, name) {
  return new Promise(function (resolve, reject) {
    return baseDir.getDirectory(name, {create: true}, resolve, reject);
  });
}
function createTree(baseMap, baseDir) {
  var treePromises = [];
  baseMap.forEach(function (subMap, dirName) {
    return treePromises.push(createDir(baseDir, dirName)
      .then(function(subDir) {
        return createTree(subMap, subDir);
      }));
  });
  return Promise.all(treePromises);
}
function createFile(parentDirEntry, name) {
  return new Promise(function(resolve, reject) {
    return parentDirEntry.getFile(name, {create: true}, resolve, reject);
  });
}
function writeFile(fileEntry, data) {
  return new Promise(function(resolve, reject) {
    return fileEntry.createWriter(function(fileWriter) {
      fileWriter.onwriteend = resolve;
      fileWriter.onerror = reject;
      fileWriter.write(data);
    }, reject);
  });
}
function removeEntry(entry) {
  return new Promise(function(resolve, reject) {
    return entry.isDirectory
      ? entry.removeRecursively(resolve)
      : entry.remove(resolve);
  });
}
function extractPatchedToDir(exMap, getPatched, dirEntry) {
  function writePatchedFileContent(file, entry, path) {
    return getPatched(path, file).then(function(patchedContent) {
      return writeFile(entry, patchedContent);
    });
  }
  var pendingFileOps = [];
  function pareDirectoryContents(baseDirEntry, baseDirMap, pathToDir) {
    return new Promise(function(resolve, reject) {
      var dirReader = baseDirEntry.createReader();
      var pendingPares = [];
      function processAndReread(results) {
        if (results.length > 0) {
          results.forEach(processEntry);
          return readDirEntries();
        } else {
          return resolve(Promise.all(pendingPares));
        }
      }
      function readDirEntries(results) {
        dirReader.readEntries(processAndReread, reject);
      }
      function processEntry(entry) {
        var entryName = entry.name;
        var pathToEntry = pathToDir
          ? pathToDir + '/' + entryName
          : pathToDir;
        if (entry.isDirectory) {
          var subDirMap = baseDirMap.get(entryName);
          // If we are supposed to have this directory
          if (subDirMap) {
            return pendingPares.push(pareDirectoryContents(
              entry,subDirMap, pathToEntry).then(function(){
                // if once the directory has been pared,
                // it has no non-existant subdirectories
                if (subDirMap.length == 0) {
                  // prune this leaf
                  baseDirMap.remove(entryName);
                }
              }));
          } else {
            return pendingFileOps.push(removeEntry(entry));
          }
        } else {
          var file = exMap.files.get(pathToEntry);
          // If we have content that is supposed to go in this file
          if (file) {
            return pendingFileOps.push(
              writePatchedFileContent(file, entry, pathToEntry)
              .then(function() {
                // Once we've written the file, we can remove the map record
                // (only non-existing files get written at the end)
                return exMap.files.delete(pathToEntry);
              }));
          } else {
            return pendingFileOps.push(removeEntry(entry));
          }
        }
      }
      readDirEntries();
    });
  }
  return pareDirectoryContents(dirEntry, exMap.dirs, '')
    .then(function () {
      // create any remaining directories
      return createTree(exMap.dirs, dirEntry);
    }).then(function addRemainingFiles() {
      // add file operations for missing files
      exMap.files.forEach(function (file, pathToFile) {
        var pathComponents = pathToFile.split('/');
        function diveForFile(deepDirEntry) {
          if (pathComponents.length > 1) {
            return createDir(deepDirEntry, pathComponents.shift())
              .then(diveForFile);
          } else {
            return createFile(deepDirEntry, pathComponents[0])
              .then(function(fileEntry){
                return writePatchedFileContent(file, fileEntry, pathToFile);
              });
          }
        }
        return pendingFileOps.push(diveForFile(dirEntry));
      });
      return Promise.all(pendingFileOps);
    }).then(function (results) {
      return dirEntry;
    });
}

clobber.extractPatchedToDir = extractPatchedToDir;
})();
