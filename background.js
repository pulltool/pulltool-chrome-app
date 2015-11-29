/* global chrome listings dirEntries clobber patching ExtractionMap
  JSZipUtils */

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

  var totalSources = 0;
  var finishedSources = 0;

  function progressMessage() {
    if (finishedSources < totalSources) {
      if (totalSources > 1) {
        return 'Downloading archives ('
          + finishedSources + '/' + totalSources + ')';
      } else {
        return 'Downloading archive';
      }
    } else {
      return 'Processing ' + (totalSources > 1 ? 'archives' : 'archive');
    }
  }

  function postDownloadProgress() {
    port.postMessage({type: 'status', message: progressMessage()});
  }

  function pullArchive(source) {
    return new Promise(function(resolve, reject){
      // TODO: use something like fetch instead of this function
      return JSZipUtils.getBinaryContent(source.url, function(err, data) {
        if (err) return reject(err);
        ++finishedSources;
        postDownloadProgress();
        return resolve(data);
      });
    });
  }

  var messageHandlers;

  function pull(listing) {
    messageHandlers = null;
    listings.setLastUsed(listing).then(function(){
      var config = JSON.parse(listing.config);

      if (config.sources) {
        totalSources = config.sources.length;
      }

      if (totalSources == 0) {
        return die(new Error('No recognized source to pull from'));
      }

      var exMap = new ExtractionMap();

      postDownloadProgress();
      // TODO: enter state where pull can be aborted
      return Promise.all(config.sources.map(pullArchive))
        .then(function(archives){

          for (var i = 0; i < archives.length; i++) {
            exMap.addArchive(config.sources[i], archives[i]);
          }

          return dirEntries.restoreEntry(listing.retainedDirId);
        }).then(function (dirEntry) {

          port.postMessage({type: 'status', message: 'Extracting archive'});
          return clobber.extractPatchedToDir(exMap,
            patching.pathFilePatcher(), dirEntry)
            .then(function () {
              port.postMessage({type: 'finish'});
              return port.disconnect();
            });

        }).catch(die);
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

      } else return port.postMessage({type: 'reject', message:
        'Message type "' + message.type + '" unrecognized or invalid'});
    } else return  port.postMessage({type: 'reject', message:
      'Current state may not be messaged'});
  }

  port.onMessage.addListener(receiveMessage);
}

chrome.runtime.onConnect.addListener(connectionListener);
