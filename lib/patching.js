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
  image.src = URL.createObjectURL(blob);
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
function applyPatch(content, patch) {
  if (patch.json) {
    return patchJson(content, patch.json);
  } else if (patch.png) {
    return patchPng(content, patch.png);
  } //TODO: throw error / warning on unrecognized patch
}
// Return the string or blob to start patching with for this file.
function initialContent(file, patch) {
  return patch.json ? file.getText() : file.getBlob();
}
patching.pathFilePatcher = function pathFilePatcher(patchRules) {
  var patchFiles = patchRules && patchRules.files;
  if (patchFiles) {
    return function potentiallyPatchedBlob(path, file) {
      var patches = patchFiles[path];
      var i = 0;
      function applyMorePatches(content) {
        if (i < patches.length) {
          return applyPatch(content, patches[i++]).then(applyMorePatches);
        } else {
          if (typeof content == 'string') {
            content = new Blob([content]);
          }
          return Promise.resolve(content);
        }
      }
      if (patches && patches.length) {
        return applyMorePatches(initialContent(file,patches[0]));
      } else return Promise.resolve(file.getBlob());
    };
  } else return function straightThrough(path, file) {
    return Promise.resolve(file.getBlob());
  };
};
})();
