import nodeType from '../../constants/node-type';
import {GRAPE_TEXT_SEPARATOR} from '../../constants/element';
import {toLowerCase} from '../../utils/string';
import {isFunction} from '../../utils/type';
import {getDeepProps, getNodeDiff, getPropDiff, getSafeChildren, getSafeProps, getNonEmptyChildrenBeforeIdx, setParentNode, createVirtualNode} from '../../vdom/node';

function setProps($node, props) {
    if(!props) {
        return;
    }
    setTextProps($node, props.textProps);
    setEventProps($node, props.events);
}
function setTextProps($node, textProps) {
    Object.entries(textProps).forEach(([attr, value]) => $node.setAttribute(attr, value));
}
function removeTextProps($node, textProps) {
    Object.keys(textProps).forEach(attr => $node.removeAttribute(attr));
}
function setEventProps($node, events) {
    Object.entries(events).forEach(([event, fn]) => $node.addEventListener(event, fn));
}
function removeEventProps($node, events) {
    Object.entries(events).forEach(([event, fn]) => $node.removeEventListener(event, fn));
}
function createArrayFragmentHTMLNode(node, $childNodes = []) {
    const $node = document.createDocumentFragment();
    $node._childNodes = $childNodes;
    return $node;
}
function createElementHTMLNode(node) {
    const $node = document.createElement(node.$$type);
    setProps($node, node.$$props);
    return $node;
}
function create(node, $childCache = new Map) {
    // if(node.$node) {
    //     throw new Error('node is already attached to the dom.');
    // }
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return node.$node = create(node.$$renderedComponent);
    }
    if(node.$$elementType === nodeType.TEXT_NODE) {
        return node.$node = document.createTextNode(node.$$textContent);
    }
    if(node.$$elementType === nodeType.PLACEHOLDER_NODE) {
        return node.$node = document.createDocumentFragment();
    }
    if(node.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
        node.$node = createArrayFragmentHTMLNode(node);
    } else {
        node.$node = createElementHTMLNode(node);
    }
    node.$$children.forEach(child => {
        let $child;
        if($childCache.has(getSafeProps(child).custom.key)) {
            $child = $childCache.get(getSafeProps(child).custom.key);
            child.$node = $child;
        } else {
            $child = create(child);
        }
        if(node.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
            node.$node._childNodes.push($child);
        }
        node.$node.appendChild($child);
    });
    return node.$node;
}
function safeRemove($node) {
    const $parent = getSafeHTMLParentNode($node);
    if($node instanceof DocumentFragment) {
        return getSafeHTMLNodeChildren($node).forEach($child => safeRemove($child));
    }
    $node.remove();
}

function getSafeHTMLNodeChildren($node) {
    return $node._childNodes || $node.childNodes;
}
function getSafeHTMLParentNode($node, immediate=true) {
    const $parent = $node._parentNode || $node.parentNode;
    if(!immediate && $parent instanceof DocumentFragment) {
        return getSafeHTMLParentNode($parent);
    }
    return $parent;
}
function getSafeHTMLNode($node) {
    if($node instanceof DocumentFragment) {
        return getSafeHTMLParentNode($node, false);
    }
    return $node;
}
function setHTMLParentNode($parent, $child) {
    if($child instanceof DocumentFragment) {
        $child._parentNode = $parent;
    }
    return $child;
}
function copyHTMLNode($$newNode, $$oldNode) {
    $$newNode.$node = $$oldNode.$node;
    if($$newNode.$$renderedComponent) {
        $$newNode.$$renderedComponent.$node = $$newNode.$node;
    }
}
function getChildKeyCache(node) {
    return getSafeChildren(node).reduce((acc, child) => {
        if('key' in getSafeProps(child).custom) {
            acc.set(getSafeProps(child).custom.key, child.$node);
        }
        return acc;
    }, new Map);
}
function patchProps($node, newProps, oldProps) {
    if($node instanceof DocumentFragment) {
        return;
    }
    const diff = getPropDiff(newProps, oldProps);
    if(!diff) {
        return;
    }
    removeTextProps($node, diff.textProps.removed);
    setTextProps($node, diff.textProps.added);
    setTextProps($node, diff.textProps.existing.changed);

    removeEventProps($node, diff.events.removed);
    removeEventProps($node, Object.keys(diff.events.existing.changed).reduce((acc, key) => {
        acc[key] = diff.events.existing.o[key];
        return acc;
    }, {}));
    setEventProps($node, diff.events.added);
    setEventProps($node, diff.events.existing.changed);
}
function patch(parent, $parent, $$newNode, $$oldNode, idx = 0) {
    const diff = getNodeDiff($$newNode, $$oldNode);
    $parent = getSafeHTMLNode($parent);
    if(diff.doesntExist) {
        if(diff.doesntExist.n) {
            doPreDetachTasks($$oldNode);
            safeRemove($$oldNode.$node);
            return;
        }
        $$newNode.$node = create($$newNode);
        doPreAttachTasks(parent, $$newNode);
        $parent.appendChild($$newNode.$node);
        doPostAttachTasks(parent, $parent, $$newNode);
        return;
    }
    if(diff.elementType || diff.type || diff.differentTexts) {
        $$newNode.$node = create($$newNode);
        if($$oldNode.$$elementType === nodeType.COMPONENT_NODE) {
            doPreDetachTasks($$oldNode);
        }
        if([nodeType.ARRAY_FRAGMENT_NODE, nodeType.PLACEHOLDER_NODE].includes($$oldNode.$$elementType)) {
            safeRemove($$oldNode.$node);
            doPreAttachTasks(parent, $$newNode);
            const numSiblingsBeforeIdx = getNonEmptyChildrenBeforeIdx($$newNode.$$parent, idx).length;
            $parent.insertBefore($$newNode.$node, getSafeHTMLNodeChildren($parent)[numSiblingsBeforeIdx] || null);
        } else {
            doPreAttachTasks(parent, $$newNode);
            $parent.replaceChild($$newNode.$node, $$oldNode.$node);
        }
        doPostAttachTasks(parent, $parent, $$newNode);
        return;
    }
    if(diff.fragment) {
        // debugger
        setParentNode(parent, $$newNode);
        const numSiblingsBeforeIdx = getNonEmptyChildrenBeforeIdx($$newNode.$$parent, idx).length;
        for(const [key, idx] of Object.entries(diff.fragment.removed)) {
            const child = getSafeChildren($$oldNode)[idx];
            doPreDetachTasks(child);
            safeRemove(child.$node);
        }
        for(const [key, idx] of Object.entries(diff.fragment.existing.n)) {
            const newChild = getSafeChildren($$newNode)[idx];
            const oldChild = getSafeChildren($$oldNode)[diff.fragment.existing.o[key]];
            patch($$newNode, $parent, newChild, oldChild);
        }
        const existingChildArray = Object.entries(diff.fragment.existing.n).map(([key, idx]) => {
            return {idx, node: getSafeChildren($$newNode)[diff.fragment.existing.n[key]]};
        }).sort((a, b) => b.idx - a.idx);
        for(let i = 1; i < existingChildArray.length; i++) {
            const currentChild = existingChildArray[i].node;
            const prevChild = existingChildArray[i - 1].node;
            if(currentChild.$node instanceof DocumentFragment || prevChild.$node instanceof DocumentFragment) {
                continue;
            }
            if(currentChild.$node.nextSibling === prevChild.$node) {
                continue;
            }
            $parent.insertBefore(currentChild.$node, prevChild.$node);
        }
        const newChildArray = Object.entries(diff.fragment.added).map(([key, idx]) => {
            const node = getSafeChildren($$newNode)[diff.fragment.added[key]];
            const $node = create(node);
            return {idx, node, isNew: true};
        });
        const updatedChildArray = [...existingChildArray, ...newChildArray].sort((a, b) => a.idx - b.idx);
        const groupedNewNodes = [];
        let fragmentParent = null;
        let nextExistingNode = null;
        let prevExistingNode = getSafeHTMLNodeChildren($parent)[numSiblingsBeforeIdx - 1] || null;
        $$newNode.$node = $$oldNode.$node;
        $$newNode.$node._childNodes = [];
        updatedChildArray.forEach((e, idx) => {
            const node = e.node;
            $$newNode.$node._childNodes.push(node.$node);
            if(e.isNew) {
                fragmentParent = fragmentParent || document.createDocumentFragment();
                fragmentParent.appendChild(node.$node);
                if(idx === updatedChildArray.length - 1) {
                    nextExistingNode = null;
                    groupedNewNodes.push({nextExistingNode, prevExistingNode, fragmentParent});
                }
                return;
            }
            if(!fragmentParent) {
                if(!(node.$node instanceof DocumentFragment)) {
                    prevExistingNode = node.$node;
                }
                return;
            }
            if(node.$node instanceof DocumentFragment) {
                nextExistingNode = null;
            } else {
                nextExistingNode = node.$node;
            }
            groupedNewNodes.push({nextExistingNode, prevExistingNode, fragmentParent});
            fragmentParent = null;
            nextExistingNode = null;
            prevExistingNode = node.$node;
        });
        groupedNewNodes.forEach(e => {
            if(e.nextExistingNode) {
                $parent.insertBefore(e.fragmentParent, e.nextExistingNode);
                return;
            }
            if(e.prevExistingNode) {
                $parent.insertBefore(e.fragmentParent, e.prevExistingNode.nextSibling);
                return;
            }
        });
        newChildArray.forEach(e => doPostAttachTasks($$newNode, $$newNode.$node, e.node));
        return;
    }
    copyHTMLNode($$newNode, $$oldNode);
    patchProps($$newNode.$node, getDeepProps($$newNode), getDeepProps($$oldNode));
    if($$oldNode.$$componentInstance) {
        $$oldNode.$$componentInstance.updateProps($$newNode.$$componentInstance.props);
        $$newNode.$$componentInstance = $$oldNode.$$componentInstance;
        attachUpdateListener(parent, $$newNode);
    }
    const $newChildren = getSafeChildren($$newNode);
    const $oldChildren = getSafeChildren($$oldNode);
    const len = Math.max($newChildren.length, $oldChildren.length);
    for(let i = 0; i < len ; i++) {
        patch($$newNode, $$newNode.$node, $newChildren[i], $oldChildren[i], i);
    }
}
function doPreDetachTasks(node) {
    let $$children = node.$$children;
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        $$children = node.$$renderedComponent.$$children;
        node.$$componentInstance.willUnmount();
    }
    if($$children) {
        $$children.forEach(child => doPreDetachTasks(child));
    }
}
function attachUpdateListener(parent, node) {
    node.$$componentInstance.setUpdateListener(() => {
        console.log('update called on', node);
        const $$newRenderedComponent = node.$$componentInstance.render();
        patch(parent, getSafeHTMLParentNode(node.$node), $$newRenderedComponent, node.$$renderedComponent);
        node.$$renderedComponent = $$newRenderedComponent;
    });
}
function setRef(node) {
    if(!node) {
        return;
    }
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return setRef(node.$$renderedComponent);
    }
    const $$props = getSafeProps(node);
    if(!('ref' in $$props.custom) || !isFunction($$props.custom.ref) || node.$node instanceof DocumentFragment) {
        return;
    }
    $$props.custom.ref(node.$node);
}
function doPostAttachTasks(parent, $parent, node) {
    const $$children = getSafeChildren(node);
    setHTMLParentNode($parent, node.$node);
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        node.$$componentInstance.mounted();
        attachUpdateListener(parent, node);
    }
    setRef(node);
    $$children.forEach(child => doPostAttachTasks(node, getSafeHTMLNode(node.$node), child));
}
function doPreAttachTasks(parent, node) {
    const $$children = getSafeChildren(node);
    setParentNode(parent, node);
    $$children.forEach(child => doPreAttachTasks(node, child));
}
function getNextNumSiblings($node, num) {
    const $childNodes = [];
    for(let $child = $node, i = 0; i < num;i++) {
        $childNodes.push($child);
        $child = $child.nextSibling;
    }
    return $childNodes;
}
function hydrate($node, node) {
    const $$children = getSafeChildren(node);
    const $childNodes = $node.childNodes;
    for(let i = 0, j = 0; i < $$children.length && j < $childNodes.length;) {
        const child = $$children[i];
        const $child = $childNodes[j];
        if(child.$$elementType === nodeType.TEXT_NODE) {
            if(!($child instanceof Text)) {
                throw 'Expected text';
            }
            child.$node = $child;
            i++, j++;
            continue;
        }
        if(child.$$elementType === nodeType.PLACEHOLDER_NODE) {
            child.$node = create(child);
            i++;
            continue;
        }
        if(child.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
            const arrayFragmentNodes = getNonEmptyChildrenBeforeIdx(child);
            const $arrayFragmentNodes = getNextNumSiblings($child, arrayFragmentNodes.length);
            arrayFragmentNodes.forEach((_child, idx) => hydrate($arrayFragmentNodes[idx], arrayFragmentNodes[idx]));
            child.$$children.forEach((_child, idx) => {
                _child.$node = $arrayFragmentNodes[idx];
            });
            child.$node = createArrayFragmentHTMLNode(child, $arrayFragmentNodes);
            i++;
            j = j + $arrayFragmentNodes.length;
            continue;
        }
        if(child.$$elementType === nodeType.ELEMENT_NODE) {
            if(toLowerCase($child.tagName) !== child.$$type) {
                throw `Expected ${child.$$type}. Got ${type}`;
            }
            child.$node = $child;
            setEventProps($child, getSafeProps(child).events);
            const children = child.$$children;
            const $children = $child.childNodes;
            children.forEach((node, idx) => hydrate($children[idx], children[idx]));
            i++, j++;
            continue;
        }
        hydrate($child, child.$$renderedComponent);
        if(child.$$renderedComponent) {
            child.$$renderedComponent.$node = $child;
        }
        child.$node = $child;
        i++, j++;
    }
    node.$node = $node;
}
function stripGrapeTextComments($parent) {
    const treeWalker = document.createTreeWalker($parent, NodeFilter.SHOW_COMMENT, ($node) => {
        if($node.nodeValue === GRAPE_TEXT_SEPARATOR) {
            return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
    });
    const nodes = [];
    while(treeWalker.nextNode()) {
        nodes.push(treeWalker.currentNode);
    }
    nodes.forEach(node => node.remove());
    return nodes;
}
export function mount($parent, node, shouldHydrate = false) {
    const parent = createVirtualNode(null, null, node);
    let $node;
    if(shouldHydrate) {
        stripGrapeTextComments($parent);
        hydrate($parent, parent);
        node.$node = $parent.firstChild;
    } else {
        $node = create(node);
    }
    doPreAttachTasks(parent, node);
    !shouldHydrate && $parent.appendChild($node);
    doPostAttachTasks(parent, $parent, node);
}
