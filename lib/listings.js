/* global chrome jsyaml listings:true */
var listings = {};
(function(){
function getListings() {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get({listings: []}, function(items) {
      resolve(items.listings);
    });
  });
}

function getLastUsed(type) {
  return new Promise(function(resolve, reject) {
    var defaultItems = {
      listings: []
    };
    var lastUsedKey = 'lastUsed_' + type;
    defaultItems[lastUsedKey] = null;
    chrome.storage.local.get(defaultItems, function(items) {
      if (items.lastUsed[type]) {
        resolve(listings.find(
          function(listing) {
            return listing.id == items[lastUsedKey]; }));
      } else resolve();
    });
  });
}

function setLastUsed(listing) {
  var config = jsyaml.safeLoad(listing.config);
  return new Promise(function(resolve, reject) {
    var items = {
      lastUsed_overall: listing.id
    };

    if (config.extension) {
      items.lastUsed_extension = listing.id;
    }

    chrome.storage.local.set(items, resolve);
  });
}

function getListing(id) {
  return getListings().then(function findListing (listings) {
    return listings.find(
      function(listing) { return listing.id == id });
  });
}

function setListings(listings) {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.set({listings: listings}, resolve);
  });
}

function updateListing(id, key, value) {
  return getListings().then(function patchListing (listings) {
    var foundListing = listings.find(
      function(listing) { return listing.id == id });
    if (!foundListing) return Promise.reject(new Error('Listing not found'));
    foundListing[key] = value;
    return setListings(listings).then(Promise.resolve(foundListing));
  });
}

function addListing(listing) {
  if (listing.id) {
    return getListings().then(function appendListing (listings) {
      listings.push(listing);
      return setListings(listings).then(Promise.resolve(listing));
    });
  } else {
    return Promise.reject(new Error('Listing has no ID'));
  }
}

listings.getAll = getListings;
listings.getById = getListing;
listings.updateById = updateListing;
listings.addNew = addListing;
listings.getLastUsed = getLastUsed;
listings.setLastUsed = setLastUsed;
})();
