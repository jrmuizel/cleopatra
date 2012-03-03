function Tree(root, data) {
  this.root = root;
  this.init(data);
  // root is autoselect
  // this.selected = null;
};

Tree.prototype = {
  init: function Tree_init(data) {
    while (this.root.querySelector("div.root")) {
      this.root.removeChild(this.root.querySelector("div.root"));
    }
    var treeRoot = document.createElement("div");
    treeRoot.className = "root";
    this.root.appendChild(treeRoot);
    var firstElem = this._createTree(treeRoot, data.data[0]); 
    treeRoot.appendChild(firstElem);
    this._select(firstElem);
    this._toggle(firstElem);
    var self = this;
    this.root.onkeypress = function (e) {
      self._onkeypress(e);
    };
    this.root.onclick = function (e) {
      self._onclick(e);
    }
    this.root.focus();
    this._setUpScrolling();
  },
  _setUpScrolling: function Tree__setUpScrolling() {
    var waitingForPaint = false;
    var accumulatedDeltaX = 0;
    var accumulatedDeltaY = 0;
    var root = this.root;
    var rootDiv = this.root.querySelector("div.root");
    this.root.addEventListener("MozMousePixelScroll", function (e) {
      if (!waitingForPaint) {
        window.mozRequestAnimationFrame(function () {
          rootDiv.scrollLeft += accumulatedDeltaX;
          root.scrollTop += accumulatedDeltaY;
          accumulatedDeltaX = 0;
          accumulatedDeltaY = 0;
          waitingForPaint = false;
        });
        waitingForPaint = true;
      }
      if (e.axis == e.HORIZONTAL_AXIS) {
        accumulatedDeltaX += e.detail;
      } else {
        accumulatedDeltaY += e.detail;
      }
      e.preventDefault();
    }, false);
  },
  _scrollHeightChanged: function Tree__scrollHeightChanged() {
    this.root.querySelector("#leftColumnBackground").style.height = this.root.querySelector("div.root").getBoundingClientRect().height + 'px';
  },
  _createTree: function Tree__createTree(root, data) {
    var div = document.createElement("div");
    div.className = "subtreeContainer collapsed";
    var hasChildren = ("children" in data) && (data.children.length > 0);
    if (!hasChildren)
      div.classList.add("leaf");
    var text = document.createElement("a");
    text.innerHTML = this._HTMLForFunction(data);
    div.treeLine = text;
    div.data = data;
    div.treeLine.className = "unselected";
    div.appendChild(text);
    div.treeChildren = [];
    div.treeParent = null;
    div.tree = this;
    if ("children" in data) {
      for (var i = 0; i < data.children.length; ++i) {
        var innerTree = this._createTree(div, data.children[i]);
        if (innerTree) {
          innerTree.treeParent = div;   
          div.appendChild(innerTree);
          div.treeChildren.push(innerTree);
        }
      }
    }
    return div;
  },
  _HTMLForFunction: function Tree__HTMLForFunction(node) {
    return '<input type="button" value="Expand / Collapse" class="expandCollapseButton" tabindex="-1"> ' +
      '<span class="sampleCount">' + node.counter + '</span> ' +
      '<span class="samplePercentage">' + (100 * node.ratio).toFixed(1) + '%</span> ' +
      '<span class="selfSampleCount">' + node.selfCounter + '</span> ' +
      '<span class="functionName">' + node.name + '</span>' +
      '<span class="libraryName">' + node.library + '</span>';
  },
  _toggle: function Tree__toggle(div, /* optional */ newCollapsedValue, /* optional */ suppressScrollHeightNotification) {
    if (newCollapsedValue === undefined) {
      div.classList.toggle("collapsed");
    } else {
      if (newCollapsedValue)
        div.classList.add("collapsed");
      else
        div.classList.remove("collapsed");
    }
    if (!suppressScrollHeightNotification)
      this._scrollHeightChanged();
  },
  _toggleAll: function Tree__toggleAll(subtreeRoot, /* optional */ newCollapsedValue) {
    // Expands / collapses all child nodes, too.
    if (newCollapsedValue === undefined)
      newCollapsedValue = !this._isCollapsed(subtreeRoot);
    this._toggle(subtreeRoot, newCollapsedValue);
    var subtree = subtreeRoot.querySelectorAll('.subtreeContainer');
    for (var i = 0; i < subtree.length; ++i) {
      this._toggle(subtree[i], newCollapsedValue, true);
    }
    this._scrollHeightChanged();
  },
  _getParent: function Tree__getParent(div) {
    return div.treeParent;
  },
  _getFirstChild: function Tree__getFirstChild(div) {
    if (this._isCollapsed(div))
      return null;
    var child = div.treeChildren[0];
    return child;
  },
  _getLastChild: function Tree__getLastChild(div) {
    if (this._isCollapsed(div))
      return div;
    var lastChild = div.treeChildren[div.treeChildren.length-1];
    if (lastChild == null)
      return div;
    return this._getLastChild(lastChild);
  },
  _getPrevSib: function Tree__getPevSib(div) {
    if (div.treeParent == null)
      return null;
    var nodeIndex = div.treeParent.treeChildren.indexOf(div);
    if (nodeIndex == 0)
      return null;
    return div.treeParent.treeChildren[nodeIndex-1];
  },
  _getNextSib: function Tree__getNextSib(div) {
    if (div.treeParent == null)
      return null;
    var nodeIndex = div.treeParent.treeChildren.indexOf(div);
    if (nodeIndex == div.treeParent.treeChildren.length - 1)
      return this._getNextSib(div.treeParent);
    return div.treeParent.treeChildren[nodeIndex+1];
  },
  _scrollIntoView: function Tree__scrollIntoView(parentScrollbox, element, maxImportantWidth) {
    // Make sure that element is inside the visible part of parentScrollbox by
    // adjusting the scroll position of parentScrollbox. If element is wider or
    // higher than the scroll port, the left and top edges are prioritized over
    // the right and bottom edges.
    // If maxImportantWidth is set, parts of the beyond this widths are
    // considered as not important; they'll not be moved into view.

    if (maxImportantWidth === undefined)
      maxImportantWidth = Infinity;

    // We can't use getBoundingClientRect() on the parentScrollbox because that
    // would give us the outer size of the scrollbox, and not the actually
    // visible part of the scroll viewport (which might be smaller due to
    // scrollbars). So we use offsetLeft/Top and clientWidth/Height.
    var r = element.getBoundingClientRect();
    var right = Math.min(r.right, r.left + maxImportantWidth);
    var leftCutoff = parentScrollbox.offsetLeft - r.left;
    var rightCutoff = right - (parentScrollbox.offsetLeft + parentScrollbox.clientWidth);
    var topCutoff = parentScrollbox.offsetTop - r.top;
    var bottomCutoff = r.bottom - (parentScrollbox.offsetTop + parentScrollbox.clientHeight);
    if (leftCutoff > 0)
      parentScrollbox.scrollLeft -= leftCutoff;
    else if (rightCutoff > 0)
      parentScrollbox.scrollLeft += Math.min(rightCutoff, -leftCutoff);
    if (topCutoff > 0)
      parentScrollbox.scrollTop -= topCutoff;
    else if (bottomCutoff > 0)
      parentScrollbox.scrollTop += Math.min(bottomCutoff, -topCutoff);
  },
  _select: function Tree__select(div) {
    if (div.tree.selected != null) {
      div.tree.selected.id = "";
      div.tree.selected.treeLine.className = "unselected";
      div.tree.selected = null;
    }
    if (div) {
      div.id = "selected_treenode";
      div.treeLine.className = "selected";
      div.tree.selected = div;
      var functionName = div.treeLine.querySelector(".functionName");
      this._scrollIntoView(div.tree.root, functionName, 400);
    }
  },
  _selected: function Tree__selected() {
    return document.getElementById("selected_treenode");
  },
  _isCollapsed: function Tree__isCollapsed(div) {
    return div.classList.contains("collapsed");
  },
  _getParentSubtreeContainer: function Tree__getParentSubtreeContainer(node) {
    while (node) {
      if (node.nodeType != node.ELEMENT_NODE)
        break;
      if (node.classList.contains("subtreeContainer"))
        return node;
      node = node.parentNode;
    }
    return null;
  },
  _onclick: function Tree__onclick(event) {
    var target = event.target;
    var node = this._getParentSubtreeContainer(target);
    if (!node)
      return;
    if (target.classList.contains("expandCollapseButton")) {
      if (event.altKey)
        this._toggleAll(node);
      else
        this._toggle(node);
    } else {
      this._select(node);
      if (event.detail == 2) // dblclick
        this._toggle(node);
    }
  },
  _onkeypress: function Tree__onkeypress(event) {
    var selected = this._selected();
    if (event.keyCode < 37 || event.keyCode > 40) {
      if (event.keyCode != 0 ||
          String.fromCharCode(event.charCode) != '*') {
        return;
      }
    }
    event.stopPropagation();
    event.preventDefault();
    if (selected == null) return false;
    if (event.keyCode == 37) { // KEY_LEFT
      var isCollapsed = this._isCollapsed(selected);
      if (!isCollapsed) {
        this._toggle(selected);
      } else {
        var parent = this._getParent(selected); 
        if (parent != null) {
          this._select(parent);
        }
      }
    } else if (event.keyCode == 38) { // KEY_UP
      var prevSib = this._getPrevSib(selected);
      var parent = this._getParent(selected); 
      if (prevSib != null) {
        this._select(this._getLastChild(prevSib));
      } else if (parent != null) {
        this._select(parent);
      }
    } else if (event.keyCode == 39) { // KEY_RIGHT
      var isCollapsed = this._isCollapsed(selected);
      if (isCollapsed) {
        this._toggle(selected);
      }
    } else if (event.keyCode == 40) { // KEY_DOWN
      var nextSib = this._getNextSib(selected);
      var child = this._getFirstChild(selected); 
      if (child != null) {
        this._select(child);
      } else if (nextSib) {
        this._select(nextSib);
      }
    } else if (String.fromCharCode(event.charCode) == '*') {
      this._toggleAll(selected);
    }
    return false;
  },
};
