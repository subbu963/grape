import nodeType from '../../constants/node-type';
import {getDiff, getSafeChildren, getSafeProps, getNumSiblingsBeforeIdx, setParentNode, createVirtualNode} from '../../vdom/node';

function setProps($node, props) {
    if(!props) {
        return;
    }
    for(const key in props.textProps) {
        $node.setAttribute(key, props.textProps[key]);
    }
    for(const key in props.events) {
        $node.addEventListener(key, props.events[key]);
    }
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
        node.$node = document.createDocumentFragment();
        node.$node._childNodes = [];
    } else {
        node.$node = document.createElement(node.$$type);
        setProps(node.$node, node.$$props);
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
    if($node instanceof DocumentFragment) {
        return getSafeHTMLNodeChildren($node).forEach($child => safeRemove($child));
    }
    $node.remove();
}

function getSafeHTMLNodeChildren($node) {
    return $node._childNodes || $node.childNodes;
}
function getSafeHTMLParentNode($node) {
    return $node._parentNode || $node.parentNode;
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
function patch(parent, $parent, $$newNode, $$oldNode, idx) {
    const diff = getDiff($$newNode, $$oldNode);
    if(diff.$doesntExist.n) {
        doPreDetachTasks($$oldNode);
        safeRemove($$oldNode.$node);
        return;
    }
    if(diff.$doesntExist.o) {
        $$newNode.$node = create($$newNode);
        doPreAttachTasks(parent, $$newNode);
        $parent.appendChild($$newNode.$node);
        doPostAttachTasks(parent, $parent, $$newNode);
        return;
    }
    if(diff.$elementType || diff.$type) {
        $$newNode.$node = create($$newNode);
        if($$oldNode.$$elementType === nodeType.COMPONENT_NODE) {
            doPreDetachTasks($$oldNode);
        }
        if([nodeType.ARRAY_FRAGMENT_NODE, nodeType.PLACEHOLDER_NODE].includes($$oldNode.$$elementType)) {
            safeRemove($$oldNode.$node);
            doPreAttachTasks(parent, $$newNode);
            const numSiblingsBeforeIdx = getNumSiblingsBeforeIdx($$newNode.$$parent, idx);
            $parent.insertBefore($$newNode.$node, getSafeHTMLNodeChildren($parent)[numSiblingsBeforeIdx] || null);
        } else {
            doPreAttachTasks(parent, $$newNode);
            $parent.replaceChild($$newNode.$node, $$oldNode.$node);
        }
        doPostAttachTasks(parent, $parent, $$newNode);
        return;
    }
    if(diff.$fragment) {
        // debugger
        for(const [key, idx] of Object.entries(diff.$fragment.$removed)) {
            const child = getSafeChildren($$oldNode)[idx];
            doPreDetachTasks(child);
            safeRemove(child.$node);
        }
        doPreAttachTasks(parent, $$newNode);
        const numSiblingsBeforeIdx = getNumSiblingsBeforeIdx($$newNode.$$parent, idx);
        $$newNode.$node = create($$newNode, getChildKeyCache($$oldNode));
        $parent.insertBefore($$newNode.$node, getSafeHTMLNodeChildren($parent)[numSiblingsBeforeIdx] || null);
        for(const [key, idx] of Object.entries(diff.$fragment.$added)) {
            const child = getSafeChildren($$newNode)[idx];
            doPostAttachTasks($$newNode, $$newNode.$node, child);
        }
        return;
    }
    copyHTMLNode($$newNode, $$oldNode);
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
function doPostAttachTasks(parent, $parent, node) {
    const $$children = getSafeChildren(node);
    setHTMLParentNode($parent, node.$node);
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        node.$$componentInstance.mounted();
        attachUpdateListener(parent, node);
    }
    $$children.forEach(child => doPostAttachTasks(node, getSafeHTMLParentNode(node.$node), child));
}
function doPreAttachTasks(parent, node) {
    const $$children = getSafeChildren(node);
    setParentNode(parent, node);
    $$children.forEach(child => doPreAttachTasks(node, child));
}
export function mount($parent, node) {
    const $node = create(node);
    const parent = createVirtualNode(null, null, node);
    doPreAttachTasks(createVirtualNode(null, null, node), node);
    $parent.appendChild($node);
    doPostAttachTasks(parent, $parent, node);
}
