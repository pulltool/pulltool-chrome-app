/* global chrome dirEntries:true */
var dirEntries = {};
(function(){
  function chooseDir() {
    return new Promise(function (resolve, reject) {
      return chrome.fileSystem.chooseEntry({
        type: "openDirectory"
      }, function(entry) {
        if (chrome.runtime.lastError)
          return reject(chrome.runtime.lastError);
        else return resolve({
          entry: entry,
          retainedId: chrome.fileSystem.retainEntry(entry)
        });
      });
    });
  }
  function restoreEntry(retainedId) {
    return new Promise(function (resolve, reject) {
      return chrome.fileSystem.restoreEntry(retainedId, function(entry) {
        if (chrome.runtime.lastError)
          return reject(chrome.runtime.lastError);
        else return resolve(entry);
      });
    });
  }
  dirEntries.chooseDir = chooseDir;
  dirEntries.restoreEntry = restoreEntry;
})();
