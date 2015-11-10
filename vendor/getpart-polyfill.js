/* global NodeFilter */

(function(){
  var wallName = 'wall';
  var partAttrName = 'part';

  function walledWalker(base) {
    return base.ownerDocument.createNodeIterator(
      base, NodeFilter.SHOW_ELEMENT,
      {acceptNode: function(node) {
        var parent = node.parentElement;
        return (!parent || parent == base ||
          parent.getAttribute(wallName) === null) ?
          NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }});
  }

  function elementGetPart(partName) {
    if (!partName) throw new Error('must provide part name');
    else partName = partName.toString();
    var boundWalker = walledWalker(this);
    var node = boundWalker.nextNode();
    while (node && node.getAttribute(partAttrName) !== partName) {
      node = boundWalker.nextNode();
    }
    return node;
  }

  function getPartValue() {
    return this.getAttribute(partAttrName);
  }

  function setPartValue(value) {
    return this.setAttribute(partAttrName, value);
  }

  function getWallValue() {
    return this.getAttribute(wallName) !== null;
  }

  function setWallValue(value) {
    if (value) {
      return this.setAttribute(wallName, '');
    } else {
      return this.removeAttribute(wallName);
    }
  }

  Object.defineProperty(Element.prototype, "part",
    {get: getPartValue, set: setPartValue});
  Object.defineProperty(Element.prototype, "wall",
    {get: getWallValue, set: setWallValue});
  Object.defineProperty(Element.prototype, "getPart",
    {value: elementGetPart});
})();
