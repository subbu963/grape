import {isString, isNumber, isArray, isDefined, isFunction, isObject} from '../utils/type';
import {toString} from '../utils/string';
import nodeType from '../constants/node-type';
import Component from '../classes/component';
import EVENTS from '../constants/events';
import {isCustomAttr} from '../utils/attr';

const PLACEHOLDER_POSSIBLE_VALUES = new Set([null, undefined, false, '']);
const NON_EMPTY_NODES = new Set([nodeType.ELEMENT_NODE, nodeType.TEXT_NODE]);

export function createVirtualNode(type, props, ...children) {
    const node = {
        $$type: type
    };
    if(props) {
        node.$$props = {
            textProps: {},
            events: {},
            custom: {}
        };
        for(const key in props) {
            if(key.startsWith('on') && EVENTS.has(key.substr(2))) {
                node.$$props.events[key.substr(2)] = props[key];
            } else if(isCustomAttr(key)) {
                node.$$props.custom[key] = props[key];
            } else {
                if(key === 'style' && isObject(props[key])) {
                    node.$$props.textProps[key] = Object.entries(props[key]).map(entry => entry.join(':')).join(';');
                } else if(key === 'class' && isArray(props[key])) {
                    node.$$props.textProps[key] = props[key].filter(e => e).join(' ');
                } else {
                    node.$$props.textProps[key] = toString(props[key]);
                }
            }
        }
    }
    if(children) {
        node.$$children = children.map(rawChildToVirtualNode);
    }
    if(type) {
        if(isFunction(type)) {
            if(Component.isPrototypeOf(type)) {
                node.$$elementType = nodeType.COMPONENT_NODE;
                node.$$componentInstance = new node.$$type(node.$$props, node.$$children);
                node.$$renderedComponent = node.$$componentInstance.render();
                if(!node.$$renderedComponent) {
                    return {
                        $$elementType: nodeType.PLACEHOLDER_NODE
                    };
                }
            }
        } else {
            node.$$elementType = nodeType.ELEMENT_NODE;
        }
    }
    return node;
}
function rawChildToVirtualNode(child) {
    if(PLACEHOLDER_POSSIBLE_VALUES.has(child)) {
        return {
            $$elementType: nodeType.PLACEHOLDER_NODE
        };
    }
    if(isDefined(child.$$elementType)) {
        return child;
    }
    if(isArray(child)) {
        return {
            $$elementType: nodeType.ARRAY_FRAGMENT_NODE,
            $$children: child.map(rawChildToVirtualNode)
        };
    }
    return {
        $$elementType: nodeType.TEXT_NODE,
        $$textContent: child
    };
}
function getChildKeyPositionMap(node) {
    return node.$$children.reduce((acc, child, idx) => {
        if(child.$$props && child.$$props.custom) {
            acc[child.$$props.custom.key] = idx;
        }
        return acc;
    }, {});
}
export function getNumSiblingsBeforeIdx(node, idx = 0) {
    const children = getSafeChildren(node);
    idx = idx || children.length;
    let numSiblings = 0;
    for(let i = 0; i < idx; i++) {
        const child = children[i];
        if(NON_EMPTY_NODES.has(child.$$elementType)) {
            numSiblings++;
            continue;
        }
        if(child.$$elementType === nodeType.PLACEHOLDER_NODE) {
            continue;
        }
        numSiblings = numSiblings + getSafeChildren(child).map(c => getSafeChildren(c)).reduce((acc, cv) => acc + cv, 0);
    }
    return numSiblings;
}
export function getSafeProps(node) {
    return node.$$props || {textProps: {}, custom: {}, events: {}};
}
export function getSafeChildren(node) {
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return node.$$renderedComponent ? node.$$renderedComponent.$$children : [];
    }
    return node.$$children || [];
}
export function setParentNode(parent, child) {
    child.$$parent = parent;
    return child;
}
export function getDiff(newNode, oldNode) {
    const diff = {
        $type: false,
        $props: false,
        $elementType: false,
        $fragment: false,
        $doesntExist: false
    };
    if(!oldNode || !newNode) {
        diff.$doesntExist = {
            o: !oldNode,
            n: !newNode
        }
        return diff;
    }
    if(newNode.$$elementType !== oldNode.$$elementType) {
        diff.$elementType = {
            o: oldNode.$$elementType,
            n: newNode.$$elementType
        };
        return diff;
    }
    if(newNode.$$type !== oldNode.$$type) {
        diff.$type = {
            o: oldNode.$$type,
            n: newNode.$$type
        };
        return diff;
    }
    if(newNode.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
        diff.$fragment = {
            $existing: {},
            $removed: {},
            $added: {}
        };
        const newKeyMap = getChildKeyPositionMap(newNode);
        const oldKeyMap = getChildKeyPositionMap(oldNode);

        Object.keys(oldKeyMap).forEach(key => {
            if(key in newKeyMap) {
                diff.$fragment.$existing[key] = newKeyMap[key];
                return;
            }
            diff.$fragment.$removed[key] = oldKeyMap[key];
        });
        Object.keys(newKeyMap).forEach(key => {
            if(key in oldKeyMap) {
                return;
            }
            diff.$fragment.$added[key] = newKeyMap[key];
        });
    }
    return diff;
}
