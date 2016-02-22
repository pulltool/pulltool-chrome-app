/* global ace cre chrome uuid listings dirEntries */

var teListingEntry = cre('.listing', {wall: true}, [
  cre('.section', {part: 'config-section'}, [
    cre('div', {part: 'config-editor'}),
  ]),
  cre('.section', {part: 'op-section'}, [
    cre('.section', {part: 'no-dir', hidden: true}, [
      cre('button', {part: 'dir-chooser', type: 'button'}, 'Choose directory')
    ]),
    cre('.section', {part: 'modified-config', hidden: true}, [
      cre('button', {part: 'config-save', type: 'button'},
        'Save config'),
      cre('button', {part: 'config-revert', type: 'button'},
        'Discard changes'),
    ]),
    cre('.section', {part: 'pull-ready', hidden: true}, [
      cre('.tightline', {part: 'dir-line'}, [
        cre('span', {part: 'dir-location'}),
        cre('button', {part: 'dir-changer', type: 'button'}, 'Change'),
      ]),
      cre('button', {part: 'pull-button'}, 'Pull')
    ]),
    cre('.section', {part: 'pull-ongoing', hidden: true}, [
      cre('output', {part: 'pull-status'})
      // TODO: cancel button
    ])
  ])
]);

function createListingObject() {
  return {id: uuid()};
}

function createListingEntry(listing) {
  var listingEntry = cre(teListingEntry);

  var opSection = listingEntry.getPart('op-section');
  function showOps(element) {
    for (var i = 0; i < opSection.children.length; i++) {
      var mode = opSection.children[i];
      mode.hidden = mode != element;
    }
  }
  var noDirOps = listingEntry.getPart('no-dir');
  var modifiedConfigOps = listingEntry.getPart('modified-config');
  var pullReadyOps = listingEntry.getPart('pull-ready');
  var ongoingOps = listingEntry.getPart('pull-ongoing');

  // TODO: determine if operation is in progress externally,
  // everywhere this is currently used
  var pullInProgress = false;

  function showApplicableOps() {
    if (editor.getValue() == listing.config) {
      if (pullInProgress) {
        return showOps(ongoingOps);
      } else {
        return showOps(pullReadyOps);
      }
    } else {
      showOps(modifiedConfigOps);
    }
  }

  var dirLocationSpan = listingEntry.getPart('dir-location');

  function displayPath(path) {
    dirLocationSpan.textContent = path;
  }

  if (listing.retainedDirId) {
    dirEntries.getDisplayPath(listing.retainedDirId).then(function (path) {
      if (path) {
        displayPath(path);
        return showApplicableOps();
      } else {
        // TODO: revoke when the path is null (not restorable)
        return showOps(noDirOps);
      }
    });
  } else showOps(noDirOps);

  function updateConfig(configJson) {
    // update our local copy for config-has-been-modified checking
    listing.config = configJson;

    return listings.updateById(listing.id, 'config', configJson);
  }

  function selectDir () {
    dirEntries.chooseDir().then(function(dir){
      dirEntries.getEntryDisplayPath(dir.entry).then(displayPath);
      return listings.updateById(
        listing.id, 'retainedDirId', dir.retainedId)
        .then(showApplicableOps);
      // TODO: read directory for config, if config is blank
    });
  }

  listingEntry.getPart('dir-chooser')
    .addEventListener('click', selectDir);
  listingEntry.getPart('dir-changer')
    .addEventListener('click', selectDir);

  var editorElement = listingEntry.getPart('config-editor');
  var editor = ace.edit(editorElement);
  var session = editor.getSession();
  editor.setTheme("ace/theme/chrome");
  session.setMode("ace/mode/yaml");
  session.setTabSize(2);
  session.setUseSoftTabs(true);
  editor.renderer.setOption('showLineNumbers', false);
  editor.setValue(listing.config || '', 1);

  // update the visible operations every time the config is modified
  session.on('change', showApplicableOps);

  function saveConfig() {
    var configJson = editor.getValue();
    return updateConfig(configJson)
      .then(showApplicableOps);
  }

  listingEntry.getPart('config-save')
    .addEventListener('click', saveConfig);

  editor.commands.addCommand({
    name: "save",
    bindKey: {win: "Ctrl-S", mac: "Command-S"},
    exec: saveConfig
  });

  function revertConfig() {
    // TODO: retrieve value to revert to directly from store
    // TODO: don't modify cursor position?
    editor.setValue(listing.config || '', 1);
    return showApplicableOps();
  }

  listingEntry.getPart('config-revert')
    .addEventListener('click', revertConfig);


  var statusOutput = listingEntry.getPart('pull-status');
  var pullButton = listingEntry.getPart('pull-button');

  function performPull() {
    var port = chrome.runtime.connect();
    port.postMessage({type: 'startPull', listingId: listing.id});
    pullInProgress = true;
    showApplicableOps();

    function updateStatus(message) {
      if (message.type == 'status') {
        statusOutput.textContent = message.message;
      } else if (message.type == 'finish') {
        pullInProgress = false;
        showApplicableOps();
      } else if (message.type == 'error') {
        // TODO: make it possible to escape this
        statusOutput.textContent = 'Error: ' + message.error.message;
        console.error(message.error);
      }
    }

    port.onMessage.addListener(updateStatus);
    port.onDisconnect.addListener(function(){
      pullInProgress = false;
      showApplicableOps();
    });
  }

  pullButton.addEventListener('click', performPull);

  return listingEntry;
}

var lastListingItem = document.getElementById('pseudo-listing');
var newListingButton = document.getElementById('new-listing');
newListingButton.addEventListener('click', function() {
  var newListing = createListingObject();
  listings.addNew(newListing);
    listingsDiv.insertBefore(
      createListingEntry(newListing), lastListingItem);
});

var listingsDiv = document.getElementById('pull-listings');
var loadingMessage = document.getElementById('loading-message');
listings.getAll().then(function(listingList) {
  loadingMessage.remove();
  newListingButton.hidden = false;
  for (var i = 0; i < listingList.length; i++) {
    listingsDiv.insertBefore(
      createListingEntry(listingList[i]), lastListingItem);
  }
});
