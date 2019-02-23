import nodeType from '../../constants/node-type';
import {getDiff} from '../../vdom/node';

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
        if([nodeType.ARRAY_FRAGMENT_NODE, nodeType.PLACEHOLDER_NODE].includes(child.$$elementType)) {
            $child._parentNode = node.$node;
            $child._idx = node.$node.childNodes.length;
        }
        node.$node.appendChild($child);
    });
    return node.$node;
}
function safeRemove($node) {
    if($node instanceof DocumentFragment) {
        return getSafeNodeChildren($node).forEach($child => safeRemove($child));
    }
    $node.remove();
}
function getSafeChildren(node) {
    return node.$$renderedComponent ? node.$$renderedComponent.$$children : (node.$$children || []);
}
function getSafeNodeChildren($node) {
    return $node._childNodes || $node.childNodes;
}
function getSafeParentNode($node) {
    return $node._parentNode || $node.parentNode;
}
function getSafeProps(node) {
    return node.$$props || {textProps: {}, custom: {}, events: {}};
}
function getChildKeyCache(node) {
    return getSafeChildren(node).reduce((acc, child) => {
        if('key' in getSafeProps(child).custom) {
            acc.set(getSafeProps(child).custom.key, child.$node);
        }
        return acc;
    }, new Map);
}
function patch($parent, $$newNode, $$oldNode) {
    const diff = getDiff($$newNode, $$oldNode);
    if(diff.$doesntExist.n) {
        doPreDetachTasks($$oldNode);
        safeRemove($$oldNode.$node);
        return;
    }
    if(diff.$doesntExist.o) {
        $$newNode.$node = create($$newNode);
        $parent.appendChild($$newNode.$node);
        doPostAttachTasks($$newNode);
        return;
    }
    if(diff.$elementType || diff.$type) {
        $$newNode.$node = create($$newNode);
        if($$oldNode.$$elementType === nodeType.COMPONENT_NODE) {
            doPreDetachTasks($$oldNode);
        }
        if([nodeType.ARRAY_FRAGMENT_NODE, nodeType.PLACEHOLDER_NODE].includes($$oldNode.$$elementType)) {
            safeRemove($$oldNode.$node);
            $parent.insertBefore($$newNode.$node, getSafeNodeChildren($parent)[$$oldNode.$node._idx] || null);
        } else {
            if([nodeType.ARRAY_FRAGMENT_NODE, nodeType.PLACEHOLDER_NODE].includes($$newNode.$$elementType)) {
                $$newNode.$node._idx = Array.from(getSafeNodeChildren($parent)).indexOf($$oldNode.$node);
                $$newNode.$node._parentNode = $parent;
            }
            $parent.replaceChild($$newNode.$node, $$oldNode.$node);
        }
        doPostAttachTasks($$newNode);
        return;
    }
    if(diff.$fragment) {
        // debugger
        for(const [key, idx] of Object.entries(diff.$fragment.$removed)) {
            const child = getSafeChildren($$oldNode)[idx];
            doPreDetachTasks(child);
            safeRemove(child.$node);
        }
        $$newNode.$node = create($$newNode, getChildKeyCache($$oldNode));
        $parent.insertBefore($$newNode.$node, getSafeNodeChildren($parent)[$$oldNode.$node._idx] || null);
        for(const [key, idx] of Object.entries(diff.$fragment.$added)) {
            const child = getSafeChildren($$newNode)[idx];
            doPostAttachTasks(child);
        }
        return;
    }
    $$newNode.$node = $$oldNode.$node;
    if($$newNode.$$renderedComponent) {
        $$newNode.$$renderedComponent.$node = $$newNode.$node;
    }
    if($$oldNode.$$componentInstance) {
        $$oldNode.$$componentInstance.updateProps($$newNode.$$componentInstance.props);
        $$newNode.$$componentInstance = $$oldNode.$$componentInstance;
        attachUpdateListener($$newNode);
    }
    const $newChildren = getSafeChildren($$newNode);
    const $oldChildren = getSafeChildren($$oldNode);
    const len = Math.max($newChildren.length, $oldChildren.length);
    for(let i = 0; i < len ; i++) {
        patch($$oldNode.$node, $newChildren[i], $oldChildren[i]);
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
function attachUpdateListener(node) {
    node.$$componentInstance.setUpdateListener(() => {
        console.log('update called on', node);
        const $$newRenderedComponent = node.$$componentInstance.render();
        patch(getSafeParentNode(node.$node), $$newRenderedComponent, node.$$renderedComponent);
        node.$$renderedComponent = $$newRenderedComponent;
    });
}
function doPostAttachTasks(node) {
    let $$children = node.$$children;
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        $$children = node.$$renderedComponent.$$children;
        node.$$componentInstance.mounted();
        attachUpdateListener(node);
    }
    if($$children) {
        $$children.forEach(child => doPostAttachTasks(child));
    }
}
export function mount($parent, node) {
    const $node = create(node);
    $parent.appendChild($node);
    doPostAttachTasks(node);
}
