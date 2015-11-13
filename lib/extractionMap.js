/* global JSZip Blob */
var extractionMap = {};
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
        exMap.set(newName, {
          dir: file.dir,
          getBlob: function getBlob() {
            return new Blob([file.asArrayBuffer()]);
          },
          getText: function getText() {
            return file.asText();
          }
        });
      }
    });
  });
}
function addToextractionMap(exMap, sourceEntry, archiveData) {
  if (sourceEntry.type == "zip") {
    return addFilesFromZip(exMap, sourceEntry, archiveData);
  }
}

})();
