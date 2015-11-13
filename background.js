/* global chrome listings dirEntries clobber JSZip JSZipUtils */

// Tell Chrome to open the app when the app launches
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html',{frame:{color:'#dd5500'}});
});

function singleMessageListener(message, sender, respond) {
  // TODO: version pinging
  if (message == 'ping') return respond('pong');
}

chrome.runtime.onMessage.addListener(singleMessageListener);
chrome.runtime.onMessageExternal.addListener(singleMessageListener);

function connectionListener(port) {
  function die(err) {
    port.postMessage({type: 'error', error: err});
    return port.disconnect();
  }

  function pullZip(sourceUrl, dirEntry) {
    port.postMessage({type: 'status', message: 'Downloading ZIP file'});
    JSZipUtils.getBinaryContent(sourceUrl, function(err, data) {
      if (err) return die(err);

      port.postMessage({type: 'status', message: 'Extracting ZIP file'});
      return clobber.dirFromZip(dirEntry, zip)
        .then(function () {
          port.postMessage({type: 'finish'});
          return port.disconnect();
        }).catch(die);
    });
  }

  var messageHandlers;

  function pull(listing) {
    messageHandlers = null;
    listings.setLastUsed(listing).then(function(){
      var config = JSON.parse(listing.config);
      if (config.source && config.source.zip) {
        // TODO: ensure permission for origin has been requested
        return dirEntries.restoreEntry(listing.retainedDirId)
          .then(function (dirEntry) {
            // TODO: enter state where pull can be aborted
            return pullZip(config.source.zip, dirEntry);
          }).catch(die);
      } else return die(new Error('No recognized source to pull from'));
    });
  }

  var starters = {
    startPull: function startPull(message) {
      if (message.listingId) {
        return listings.getById(message.listingId)
          .then(function (listing) {
            if (listing) {
              return pull(listing);
            } else return die(new Error(
              'Listing "' + message.listingId + '" not found'));
          });
      } else return die(new Error('No listingId to pull specified'));
    },
    repeatLastPull: function repeatLastPull(message) {
      if (message.pullType) {
        return listings.getLastUsed(message.pullType)
          .then(function (listing) {
            if (listing) {
              return pull(listing);
            } else return die(new Error(
              'No last "' + message.pullType + '" pull listed'));
          });
      } else return die(new Error('No pullType to repeat specified'));
    }
  };

  messageHandlers = starters;

  function receiveMessage(message) {
    if (messageHandlers) {
      var handler = messageHandlers[message.type];
      if (handler) {
        return handler(message);

      // TODO: replace with rejections + warnings without dying (just ignoring)
      // since that's better for extensibility
      } else return die(new Error(
        'Message type "' + message.type + '" unrecognized or invalid'));
    } else return die(new Error('Current state may not be messaged'));
  }

  port.onMessage.addListener(receiveMessage);
}

chrome.runtime.onConnect.addListener(connectionListener);
