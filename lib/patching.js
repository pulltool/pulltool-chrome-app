/* global Blob URL */
var patching = {};
(function(){
function patchJson(text, patch) {
  var value = JSON.parse(text);
  if (patch.set) {
    var keys = Object.keys(patch.set);
    for (var i = 0; i < keys.length; i++) {
      value[keys[i]] = patch.set[keys[i]];
    }
  }
  return Promise.resolve(JSON.stringify(value));
}
var image = document.createElement('img');
var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
function compositeColor(compositing, color) {
  ctx.globalCompositeOperation = compositing;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
function drawCompositedImage(compositing) {
  ctx.globalCompositeOperation = compositing;
  ctx.drawImage(image, 0, 0);
}
function patchImage(blob, patch) {
  image.src = URL.getDataURL(blob);
  canvas.width = image.width;
  canvas.height = image.height;
  if (patch.setColor) {
    drawCompositedImage('copy');
    compositeColor('color', patch.setColor);
    drawCompositedImage('destination-in');
  } else if (patch.setHue) {
    drawCompositedImage('copy');
    compositeColor('hue', 'hsl('+(patch.setHue)+',100%,50%)');
    drawCompositedImage('destination-in');
  } else if (patch.fillColor) {
    compositeColor('copy', patch.fillColor);
    drawCompositedImage('destination-in');
  }
}
function patchPng(blob, patch) {
  return new Promise(function(resolve, reject) {
    patchImage(blob, patch);
    return canvas.toBlob(resolve, 'image/png');
  });
}
function applyPatch(i, value, patch) {
  if (patch.json) {
    return patchJson(value, patch.json);
  } else if (patch.png) {
    return patchPng(value, patch.png);
  } //TODO: throw error / warning on unrecognized patch
}
// Return the string or blob to start patching with for this file.
function firstValue(file, patch) {
  return patch.json ? file.getText() : file.getBlob();
}
patching.pathFilePatcher = function pathFilePatcher(patchRules) {
  var patchFiles = patchRules.files;
  if (patchFiles) {
    return function potentiallyPatchedBlob(path, file) {
      var patches = patchFiles[path];
      var i = 0;
      function applyMorePatches(value) {
        if (i < patches.length) {
          return applyPatch(patches[i++], value).then(applyMorePatches);
        } else {
          if (typeof value == 'string') {
            value = new Blob([value]);
          }
          return Promise.resolve(value);
        }
      }
      if (patches && patches.length) {
        return applyMorePatches(firstValue(file,patches[0]));
      } else return Promise.resolve(file.getBlob());
    };
  } else return function straightThrough(path, file) {
    return Promise.resolve(file.getBlob());
  };
};
})();
