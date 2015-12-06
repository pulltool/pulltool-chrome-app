/* global ace cre chrome uuid listings dirEntries */

var teListingEntry = cre('.listing', {wall: true}, [
  cre('.section', {part: 'config-section'}, [
    cre('div', {part: 'config-editor'}),
  ]),
  cre('.section', {part: 'op-section'}, [
    cre('button', {part: 'dir-chooser', type: 'button'}, 'Choose directory'),
    cre('button', {part: 'config-save', type: 'button'}, 'Save config'),
    cre('button', {part: 'pull-button'}, 'Pull'),
    cre('output', {part: 'pull-status'})
  ])
]);

function createListingObject() {
  return {id: uuid()};
}

function createListingEntry(listing) {
  var listingEntry = cre(teListingEntry);

  function updateConfig(configJson) {
    return listings.updateById(listing.id, 'config', configJson);
  }

  listingEntry.getPart('dir-chooser')
    .addEventListener('click', function (evt) {
      dirEntries.chooseDir().then(function(dir){
        return listings.updateById(
          listing.id, 'retainedDirId', dir.retainedId);
        // TODO: read directory for config
        // TODO: check for manifest, auto-associate with extension
      });
    });

  var editorElement = listingEntry.getPart('config-editor');
  var editor = ace.edit(editorElement);
  var session = editor.getSession();
  editor.setTheme("ace/theme/chrome");
  session.setMode("ace/mode/yaml");
  session.setTabSize(2);
  session.setUseSoftTabs(true);
  editor.renderer.setOption('showLineNumbers', false);
  editor.setValue(listing.config || '');

  function saveConfig() {
    var configJson = editor.getValue();
    updateConfig(configJson);
    // TODO: Acknowledge config update saved
  }

  listingEntry.getPart('config-save')
    .addEventListener('click', saveConfig);

  editor.commands.addCommand({
    name: "save",
    bindKey: {win: "Ctrl-S", mac: "Command-S"},
    exec: saveConfig
  });

  var statusOutput = listingEntry.getPart('pull-status');
  var pullButton = listingEntry.getPart('pull-button');

  function performPull() {
    var port = chrome.runtime.connect();
    port.postMessage({type: 'startPull', listingId: listing.id});
    pullButton.disabled = true;

    function updateStatus(message) {
      if (message.type == 'status') {
        statusOutput.hidden = false;
        statusOutput.textContent = message.message;
      } else if (message.type == 'finish') {
        statusOutput.hidden = true;
      } else if (message.type == 'error') {
        statusOutput.hidden = false;
        statusOutput.textContent = 'Error: ' + message.error.message;
        console.error(message.error);
      }
    }

    port.onMessage.addListener(updateStatus);
    port.onDisconnect.addListener(function(){
      pullButton.disabled = false;
    });
  }

  pullButton.addEventListener('click', performPull);

  return listingEntry;
}

var lastListingItem = document.getElementById('pseudo-listing');

document.getElementById('new-listing').addEventListener('click', function() {
  var newListing = createListingObject();
  listings.addNew(newListing);
    listingsDiv.insertBefore(
      createListingEntry(newListing), lastListingItem);
});

var listingsDiv = document.getElementById('pull-listings');

listings.getAll().then(function(listingList){
  for (var i = 0; i < listingList.length; i++) {
    listingsDiv.insertBefore(
      createListingEntry(listingList[i]), lastListingItem);
  }
});
