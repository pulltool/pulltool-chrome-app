/* global cre chrome uuid */

function getPulls() {
  return new Promise(function(reject, resolve) {
    chrome.storage.local.get({pulls: []}, function(items) {
      resolve(items.pulls);
    });
  });
}

function getPull(id) {
  return getPulls().then(function findPull (pulls) {
    return pulls.find(function(pull) { return pull.id == id });
  });
}

function setPulls(pulls) {
  return new Promise(function(reject, resolve) {
    chrome.storage.local.set({pulls: pulls}, function(items) {
      resolve(pulls);
    });
  });
}

function updatePull(id, key, value) {
  return getPulls().then(function patchPull (pulls) {
    var foundPull = pulls.find(function(pull) { return pull.id == id });
    if (!foundPull) return Promise.reject(new Error('Pull not found'));
    foundPull[key] = value;
    return setPulls(pulls);
  });
}

function addPull(pull) {
  if (pull.id) {
    return getPulls().then(function patchPull (pulls) {
      pulls.push(pull);
      return setPulls(pulls);
    });
  } else {
    return Promise.reject(new Error('Pull has no ID'));
  }
}

var teDirChooserButton = cre('button.dir-chooser', {
  type:'button'}, 'Choose directory');

function createPull() {
  return {id: uuid()};
}

function createPullEditor(pull) {
  var dirChooserButton = cre(teDirChooserButton);

}
