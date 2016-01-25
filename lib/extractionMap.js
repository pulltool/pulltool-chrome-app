/* global JSZip Blob */
function ExtractionMap() {
  this.files = new Map();
  this.dirs = new Map();
}
(function(){
function pathPrefixOrNothing(path) {
  return path
    ? path.slice(-1) == '/'
      ? path
      : path + '/'
    : '';
}
function remappedPath(name, slicing) {
  if (name.slice(0, slicing.from.length) == slicing.from) {
    return slicing.to + name.slice(slicing.from.length);
  } else return null;
}
function fillMaps(base, path) {
  if (path[0]) {
    var newBase = base.get(path[0]);
    if (!newBase) {
      newBase = new Map();
      base.set(path[0], newBase);
    }
    return fillMaps(newBase, path.slice(1));
  }
}
function addFileFromBlob(exMap, sourceEntry, blob) {
  // TODO: maybe normalize path a bit less clumsily (handle . and ..)
  var dest = sourceEntry.as.replace(/\/+/g,'/');
  fillMaps(exMap.dirs, dest.split('/').slice(0,-1));
  exMap.files.set(dest, {
    getBlob: function getBlob() {
      return Promise.resolve(blob);
    },
    getText: function getText() {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onloadend = function () {
          return resolve(reader.result || '');
        };
        reader.onerror = reject;
        reader.readAsText(blob);
      });
    }
  });
}
function addFilesFromZip(exMap, sourceEntry, zipData) {
  var zip = new JSZip(zipData);
  var names = Object.keys(zip.files);
  var slicings = sourceEntry.slice || [{}];
  slicings.forEach(function normalizeSlicing(slicing) {
    slicing.from = pathPrefixOrNothing(slicing.from);
    slicing.to = pathPrefixOrNothing(slicing.to);
  });
  names.forEach(function addExMapEntries(name) {
    slicings.forEach(function addEntryForSlice(slicing) {
      var newName = remappedPath(name, slicing);
      if (newName) {
        var file = zip.files[name];
        if (file.dir) {
          fillMaps(exMap.dirs, newName.split('/'));
        } else {
          exMap.files.set(newName, {
            getBlob: function getBlob() {
              return Promise.resolve(new Blob([file.asArrayBuffer()]));
            },
            getText: function getText() {
              return Promise.resolve(file.asText());
            }
          });
        }
      }
    });
  });
}
ExtractionMap.prototype.addArchive =
function addArchiveToExtractionMap(sourceEntry, archiveData) {
  if (sourceEntry.type == 'zip') {
    return addFilesFromZip(this, sourceEntry, archiveData);
  } else if (sourceEntry.type == 'blob') {
    return addFileFromBlob(this, sourceEntry, archiveData);
  }
};
})();
