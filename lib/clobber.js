/* global Blob chrome clobber:true */
var clobber = {};
(function(){
function removeDirectoryContents(dirEntry) {
  return new Promise(function(resolve, reject) {
    var dirReader = dirEntry.createReader();
    var entriesToRemove = 0;
    var allEntriesRead = false;
    function entryRemovalCallback() {
      --entriesToRemove;
      if (entriesToRemove == 0 && allEntriesRead) return resolve();
    }
    function removeEntry(entry) {
      ++entriesToRemove;
      return entry.isDirectory
        ? entry.removeRecursively(entryRemovalCallback)
        : entry.remove(entryRemovalCallback);
    }
    function removeAndRecurse(results) {
      if (results.length > 0) {
        results.forEach(removeEntry);
        return readDirEntries();
      } else if (entriesToRemove == 0) {
        return resolve();
      } else {
        allEntriesRead = true;
      }
    }
    function readDirEntries(results) {
      dirReader.readEntries(removeAndRecurse, reject);
    }
    readDirEntries();
  });
}
function createDir(rootDirEntry, path) {
  if (typeof path == 'string') path = path.split('/');
  return new Promise(function (resolve, reject) {
    function createDirs(parentDirEntry, folders) {
      // Throw out './' or '/' and move on
      // to prevent something like '/foo/.//bar'.
      while (folders[0] == '.' || folders[0] == '') {
        folders.unshift();
      }
      // Recursively add the new subfolder
      // (if we still have another to create).
      if (folders.length) {
        parentDirEntry.getDirectory(folders[0], {create: true},
          function(dirEntry) {
            return createDirs(dirEntry, folders.slice(1));
          }, reject);
      } else resolve(parentDirEntry);
    }
    return createDirs(rootDirEntry, path);
  });
}
function createFile(parentDirEntry, name, data) {
  return new Promise(function(resolve, reject) {
    return parentDirEntry.getFile(name, {create: true}, function(fileEntry) {
      return fileEntry.createWriter(function(fileWriter) {
        fileWriter.onwriteend = resolve;
        fileWriter.onerror = reject;
        fileWriter.write(data);
      }, reject);
    }, reject);
  });
}
function extractZipToDirectory(zip, dirEntry) {
  var names = Object.keys(zip.files);
  var fsOpPromises = names.map(function (name) {
    var file = zip.files[name];
    if (file.dir) {
      return createDir(dirEntry, name);
    } else {
      var filePath = name.split('/');
      var filename = filePath.pop();
      return createDir(dirEntry, filePath).then(function (parentDirEntry) {
        return createFile(parentDirEntry, filename,
          new Blob(file.asArrayBuffer()));
      });
    }
  });
  return Promise.all(fsOpPromises).then(function(results) {
    return dirEntry;
  });
}
function clobberDirectoryFromZip(dirEntry, zip) {
  return removeDirectoryContents(dirEntry)
    .then(extractZipToDirectory.bind(null, zip, dirEntry));
}
clobber.dirFromZip = clobberDirectoryFromZip;
})();
