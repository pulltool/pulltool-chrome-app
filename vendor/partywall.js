/* global MutationObserver */

function partywallStyler (opts) {
  opts = opts || {};

  var document = opts.document || window.document;

  var wallName = opts.wallName || 'wall';
  var partAttrName = opts.partAttrName || 'part';
  var maxKnownDepth = 0;

  var styleElement = document.createElement('style');
  document.head.appendChild(styleElement);
  var styleSheet = styleElement.sheet;
  var styleRules = styleSheet.cssRules;
  var walledStyles = [];

  function walledSelectorsAtDepth(levels, depth) {
    var finalSelectors = [];

    function addPostWallSelector(prefix, depth, child, rest) {
      if (child) {
        var depthSelector = '[data-partywall-depth="' + depth + '"]';
        if (rest.length > 0) depthSelector += '[' + wallName + ']';
        var postWall;
        var suffix = depthSelector;
        if (Array.isArray(child)) {
          postWall = child[0];
          suffix += ' ' + child.slice(1).join(' ');
        } else {
          postWall = child;
        }
        var idMatch = /^([^#]*)#([a-zA-Z0-9_-]+)(.*)$/.exec(postWall);
        if (idMatch) {
          addPostWallSelector(prefix + ' ' + idMatch[1] +
            '[' + partAttrName + '="' + idMatch[2] + '"]' +
              idMatch[3] + suffix,
            depth + 1, rest[0], rest.slice(1));
        }
        return addPostWallSelector(
          prefix + ' ' + postWall + suffix,
          depth + 1, rest[0], rest.slice(1));
      } else {
        return finalSelectors.push(prefix);
      }
    }

    if (levels[0] == '') {
      if (depth == 0) {
        addPostWallSelector('', 0, levels[1], levels.slice(2));
      } else {
        throw new Error('attempt to calculate deep root-bound selector');
      }
    } else {
      addPostWallSelector(
        (Array.isArray(levels[0]) ? levels[0].join(' ') : levels[0]) +
          '[data-partywall-depth="' + depth + '"][' + wallName + ']',
        depth+1, levels[1], levels.slice(2));
    }
    return finalSelectors.join();
  }

  function selectorTextBetweenDepths(levels, startDepth, endDepth) {
    if (levels[0] == '') return '';
    var depthSelectors = [];
    for (var i = startDepth; i < endDepth + 2 - levels.length; i++) {
      depthSelectors.push(walledSelectorsAtDepth(levels, i));
    }
    return depthSelectors.join();
  }

  function maxDepthOfSelectorsInList(list) {
    return list.reduce(
      function maxSublistLength(previous, levels) {
        return Math.max(previous, levels.length);
      }, maxKnownDepth);
  }

  function walledSelectorTextsToMaxDepth(list) {
    var finalDepth = maxDepthOfSelectorsInList(list);
    var selectorTextList = [];
    for (var i = 0; i < list.length; i++) {
      var levels = list[i];
      selectorTextList.push((levels[0] == '')
        ? walledSelectorsAtDepth(levels, 0)
        : selectorTextBetweenDepths(levels, 0, finalDepth));
    }
    return selectorTextList.join();
  }

  function createWalledStyle(list, styleText) {
    var styleRule = styleRules[styleSheet.insertRule(
      walledSelectorTextsToMaxDepth(list) + ' {' + styleText + '}',
      styleRules.length)];

    var walledStyleObject = {
      get selectorList() {return list},
      set selectorList(newList) {
        styleRule.selector = walledSelectorTextsToMaxDepth(newList);
        walledStyleObject.selectorList = newList;
        list = newList;
      },
      styleRule: styleRule
    };
    walledStyles.push(walledStyleObject);
    return walledStyles;
  }

  function childWallDepth(element) {
    var depth = +element.getAttribute('data-partywall-depth');
    return (element.getAttribute(wallName) === null) ? depth : depth + 1;
  }

  function updateListWallDepths(list, depth) {
    var maxDepth = depth;
    for (var i = 0; i < list.length; i++) {
      maxDepth = Math.max(maxDepth,
        updateTreeWallDepths(list[i], depth));
    }
    return maxDepth;
  }

  function addLevelsToSelector(walledStyle, newMaxDepth) {
    var list = walledStyle.selectorList;
    var currentDepth = maxDepthOfSelectorsInList(list);
    if (currentDepth < newMaxDepth) {
      var selectorTextList = [];
      for (var i = 0; i < list.length; i++) {
        var levels = list[i];
        if (levels[0] != '') {
          selectorTextList.push(
            selectorTextBetweenDepths(levels,
              currentDepth - levels.length, newMaxDepth));
        }
      }
      var newSelectorText = selectorTextList.join();
      if (newSelectorText) {
        walledStyle.styleRule.selector += ',' + newSelectorText;
      }
    }
  }

  function updateMaxDepth(newMaxDepth) {
    if (newMaxDepth > maxKnownDepth) {
      for (var i = 0; i < walledStyles.length; i++) {
        addLevelsToSelector(walledStyles[i], newMaxDepth);
      }
      maxKnownDepth = newMaxDepth;
    }
  }

  function updateTreeWallDepths(root, depth) {
    root.setAttribute('data-partywall-depth', depth);
    return updateListWallDepths(root.children, childWallDepth(root));
  }

  function applyForEach(fn) {
    return function(array) {
      for (var i = 0; i < array.length; i++) fn(array[i]);
    };
  }

  function observeTreeChanges(mutation) {
    var parent = mutation.target;
    var childElements = [];
    var addedNodes = mutation.addedNodes;
    for (var i = 0; i < addedNodes.length; i++) {
      if (addedNodes[i].nodeType == 1) childElements.push(addedNodes[i]);
    }

    return updateMaxDepth(
      updateListWallDepths(childElements, childWallDepth(parent)));
  }
  var treeObserver = new MutationObserver(applyForEach(observeTreeChanges));
  treeObserver.observe(document.documentElement,
    {childList: true, subtree: true});

  function observeWallChanges(mutation) {
    if (mutation.attributeName == wallName &&
      mutation.attributeNamespace === null) {

      return updateMaxDepth(
        updateListWallDepths(mutation.target.children,
          childWallDepth(mutation.target)));
    }
  }
  var attrObserver = new MutationObserver(applyForEach(observeWallChanges));
  attrObserver.observe(document.documentElement,
    {attributes: true, subtree: true, attributeFilter: [wallName]});

  updateMaxDepth(updateTreeWallDepths(document.documentElement, 0));

  return {
    walledStyles: walledStyles,
    addStyle: createWalledStyle,
    walledSelector: walledSelectorTextsToMaxDepth
  };
}
