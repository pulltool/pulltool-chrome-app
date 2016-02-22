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
  function getEntryDisplayPath(entry) {
    return new Promise(function (resolve, reject) {
      return chrome.fileSystem.getDisplayPath(entry, function(path) {
        if (chrome.runtime.lastError)
          return reject(chrome.runtime.lastError);
        else return resolve(path);
      });
    });
  }
  function getDisplayPath(retainedId) {
    return new Promise(function (resolve, reject) {
      return chrome.fileSystem.isRestorable(retainedId, function(restorable) {
        if (chrome.runtime.lastError)
          return reject(chrome.runtime.lastError);
        else if (restorable) {
          return restoreEntry(retainedId).then(getEntryDisplayPath)
            .then(resolve, reject);
        } else return resolve(null);
      });
    });
  }
  dirEntries.chooseDir = chooseDir;
  dirEntries.restoreEntry = restoreEntry;
  dirEntries.getDisplayPath = getDisplayPath;
  dirEntries.getEntryDisplayPath = getEntryDisplayPath;
})();
