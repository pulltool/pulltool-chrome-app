/* global chrome */

// Tell Chrome to open the app when the app launches
chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html');
});

function singleMessageListener(message, sender, respond) {

}

chrome.runtime.onMessage.addListener(singleMessageListener);
chrome.runtime.onMessageExternal.addListener(singleMessageListener);

function connectionListener(port) {
  function receiveMessage(message) {
    if (message.type == 'startPull') {

    }
  }
  port.onMessage.addListener(receiveMessage);
}

chrome.runtime.onConnect.addListener(connectionListener);
