/* global cre chrome uuid listings dirEntries */

var teListingEntry = cre('.listing', {wall: true}, [
  cre('.section', {part: 'dir-section'}, [
    cre('button', {part: 'dir-chooser', type: 'button'}, 'Choose directory')
  ]),
  cre('.section', {part: 'config-section'}, [
    cre('textarea', {part: 'config-textarea'}),
    cre('button', {part: 'config-save', type: 'button'}, 'Save config')
  ]),
  cre('.section', {part: 'context-section'}, []),
  cre('.section', {part: 'op-section'}, [
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

  var configTextArea = listingEntry.getPart('config-textarea');
  configTextArea.value = listing.config || '';

  listingEntry.getPart('config-save')
    .addEventListener('click', function(evt) {
      var configJson = configTextArea.value;
      updateConfig(configJson);
      // TODO: Acknowledge config update saved
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
