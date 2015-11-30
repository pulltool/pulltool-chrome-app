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
function regexpEscape(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
function loosenSpaces(expr) {
  return expr.replace(/\b\s+\b/g,'\\s+').replace(/\s+/g,'\\s*');
}
function patchText(text, patch) {
  for (var i = 0; i < patch.length; i++) {
    var rule = patch[i];
    var regex;
    var flags = rule.flags || '';
    if (rule.replace) {
      if (rule.case == 'insensitive') flags += 'i';
      if (rule.pattern) {
        if (rule.pattern.toLowerCase.slice(0,5) == 'regex') {
          regex = new RegExp(rule.replace, flags);
          text = text.replace(regex, rule.with);
        } else {
          // do nothing
          // TODO: warn when this happens
        }
      } else {
        flags += 'm';
        regex = regexpEscape(rule.replace);
        if (rule.space == 'loose') regex = loosenSpaces(regex);
        if (rule.line == 'whole' || rule.lines == 'whole') {
          regex = '^' + regex + '$';
        }

        // simple case for {limit: 1}
        if (rule.limit == 1 && !rule.skip) {
          regex = new RegExp(regex, flags);
          text = text.replace(regex, rule.with);

        // if replacement is otherwise non-global
        } else if (rule.limit || rule.skip) {
          var matches = 0;
          var skip = rule.skip || 0;
          var limit = rule.limit || 0;
          regex = new RegExp(regex, flags);
          var replacement = rule.with;
          text = text.replace(regex, function(match) {
            var result;
            result = matches >= skip && (!limit || matches < skip + limit) ?
              replacement : match;
            ++matches;
            return result;
          });

        // simple global replacement case
        } else {
          flags += 'g';
          regex = new RegExp(regex, flags);
          text = text.replace(regex, rule.with);
        }
      }
    }
  }
  return Promise.resolve(text);
}
var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
function compositeColor(compositing, color) {
  ctx.globalCompositeOperation = compositing;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function patchImage(patch, image) {
  function drawCompositedImage(compositing) {
    ctx.globalCompositeOperation = compositing;
    ctx.drawImage(image, 0, 0);
  }
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
  var image = document.createElement('img');
  return new Promise(function(resolve, reject) {
    function finishPatch() {
      image.removeEventListener('load', finishPatch);
      patchImage(patch, image);
      return canvas.toBlob(resolve, 'image/png');
    }
    image.src = URL.createObjectURL(blob);
    if (image.complete) { // even though this should be impossible
      return finishPatch();
    } else {
      return image.addEventListener('load', finishPatch);
    }
  });
}
function applyPatch(content, patch) {
  if (patch.text) {
    if (Array.isArray(patch.text)) {
      return patchText(content, patch.text);
    } else {
      return patchText(content, [patch.text]);
    }
  } else if (patch.json) {
    return patchJson(content, patch.json);
  } else if (patch.png) {
    return patchPng(content, patch.png);
  } //TODO: throw error / warning on unrecognized patch
}
// Return the string or blob to start patching with for this file.
function initialContent(file, patch) {
  return patch.text || patch.json ? file.getText() : file.getBlob();
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
