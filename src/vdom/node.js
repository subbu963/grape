import {isString, isNumber, isArray, isDefined, isFunction, isObject} from '../utils/type';
import {toString} from '../utils/string';
import {createDiffingMap, objectDiff} from '../utils/object';
import nodeType from '../constants/node-type';
import {VOID_ELEMENTS} from '../constants/element';
import Component from '../classes/component';
import EVENTS from '../constants/events';
import {isCustomAttr} from '../utils/attr';

// We render `PLACEHOLDER_NODE` for these values
const PLACEHOLDER_POSSIBLE_VALUES = new Set([null, undefined, false, '']);
// Nodes which give valid html nodes
const NON_EMPTY_NODES = new Set([nodeType.ELEMENT_NODE, nodeType.TEXT_NODE]);

/**
 * This function creates a virtual node
 * @param {(string|function)} type type of the node
 * @param {object} props node props
 * @param {...(string|object[]|object|undefined|boolean)} children children of the node
 * @returns {object} virtual node
 */
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
        // Store the original props to be used for components
        node.$$originalProps = props;
        for(const key in props) {
            // events
            if(key.startsWith('on') && EVENTS.has(key.substr(2))) {
                node.$$props.events[key.substr(2)] = props[key];
            // custom attributes
            } else if(isCustomAttr(key)) {
                node.$$props.custom[key] = props[key];
            // text props
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
        node.$$children = rawChildrenToVirtualNodes(children);
    }
    if(type) {
        if(isFunction(type)) {
            // classes should extend `Component`
            if(Component.isPrototypeOf(type)) {
                node.$$elementType = nodeType.COMPONENT_NODE;
                // create an instance of the component
                node.$$componentInstance = new node.$$type(node.$$originalProps, node.$$children);
                // render the component
                node.$$renderedComponent = node.$$componentInstance.render();
                // if it returns `null` return a `PLACEHOLDER_NODE`
                if(!node.$$renderedComponent) {
                    return {
                        $$elementType: nodeType.PLACEHOLDER_NODE
                    };
                }
                // first child of a component shouldnt be a text node
                if(node.$$renderedComponent.$$elementType === nodeType.TEXT_NODE) {
                    throw `Class ${type.name} render method returned a text node. It should return either a component, dom node or null`;
                }
                // components by default are self closing
                node.$$isSelfClosing = true;
            } else {
                throw `Class ${type.name} should extend Component`;
            }
        } else {
            node.$$elementType = nodeType.ELEMENT_NODE;
            node.$$isSelfClosing = VOID_ELEMENTS.has(node.$$type) && !node.$$children;
        }
    }
    return node;
}
/**
 * This function takes in an array of raw child nodes and returns an array of virtual nodes
 * @param {array} rawChildren raw node children
 * @returns {array} array of virtual nodes
 */
function rawChildrenToVirtualNodes(rawChildren) {
    const children = [];
    // We need this flag to differentiate children from `ARRAY_FRAGMENT_NODE`
    children.$$isComponentChildren = true;
    for(const rawChild of rawChildren) {
        if(PLACEHOLDER_POSSIBLE_VALUES.has(rawChild)) {
            children.push({
                $$elementType: nodeType.PLACEHOLDER_NODE
            });
            continue;
        }
        // child has `$$elementType` only when it is already a virtual node
        if(isDefined(rawChild.$$elementType)) {
            children.push(rawChild);
            continue;
        }
        if(isArray(rawChild)) {
            if(rawChild.$$isComponentChildren) {
                children.push(...rawChild);
                continue;
            }
            // Its `ARRAY_FRAGMENT_NODE`
            children.push({
                $$elementType: nodeType.ARRAY_FRAGMENT_NODE,
                $$children: rawChildrenToVirtualNodes(rawChild)
            });
            continue;
        }
        // Component nodes call `createVirtualNode` before this step. So they are already virtual nodes
        children.push({
            $$elementType: nodeType.TEXT_NODE,
            $$textContent: rawChild
        });
    }
    return children;
}
// It gives you the function
/**
 * This function takes in an array of raw child nodes and returns an array of virtual nodes
 * @param {array} rawChildren raw node children
 * @returns {array} array of virtual nodes
 */
function getChildKeyPositionMap(node) {
    return node.$$children.reduce((acc, child, idx) => {
        if(child.$$props && child.$$props.custom) {
            acc[child.$$props.custom.key] = idx;
        }
        return acc;
    }, {});
}
export function getNonEmptyChildrenBeforeIdx(parent, idx = 0) {
    const allChildren = getSafeChildren(parent);
    idx = idx || allChildren.length;
    const childrenBeforeIdx = [];
    for(let i = 0; i < idx; i++) {
        const child = allChildren[i];
        if(NON_EMPTY_NODES.has(child.$$elementType)) {
            childrenBeforeIdx.push(child);
            continue;
        }
        if(child.$$elementType === nodeType.PLACEHOLDER_NODE) {
            continue;
        }
        if(child.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
            childrenBeforeIdx.push(...getNonEmptyChildrenBeforeIdx(child));
            continue;
        }
        if(child.$$renderedComponent) {
            const $$renderedComponent = getDeepElement(child);
            if($$renderedComponent) {
                childrenBeforeIdx.push($$renderedComponent);
            }
        }
    }
    return childrenBeforeIdx;
}
export function getSafeProps(node) {
    return (node && node.$$props) || {textProps: {}, custom: {}, events: {}};
}
export function getDeepProps(node) {
    return getSafeProps(getDeepElement(node));
}
export function getSafeChildren(node) {
    if(!node) {
        return [];
    }
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return getSafeChildren(node.$$renderedComponent);
    }
    return node.$$children || [];
}
export function setParentNode(parent, child) {
    child.$$parent = parent;
    return child;
}
export function getDeepElementType(node) {
    if(!node) {
        return nodeType.PLACEHOLDER_NODE;
    }
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return getDeepElementType(node.$$renderedComponent);
    }
    return node.$$elementType;
}
export function getDeepElement(node) {
    if(!node) {
        return null;
    }
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return getDeepElement(node.$$renderedComponent);
    }
    return node;
}
export function getPropDiff(newProps, oldProps) {
    if(!newProps && !oldProps) {
        return null;
    }
    const diff = {
        textProps: createDiffingMap(),
        events: createDiffingMap()
    }
    if(!newProps) {
        diff.textProps.removed = oldProps.textProps;
        diff.events.removed = oldProps.events;
    } else if(!oldProps) {
        diff.textProps.added = newProps.textProps;
        diff.events.added = newProps.events;
    } else {
        diff.textProps = objectDiff(newProps.textProps, oldProps.textProps);
        diff.events = objectDiff(newProps.events, oldProps.events);
    }
    return diff;
}
export function createDummyNode($$children) {
    return {$$children, $$elementType: nodeType.DUMMY_NODE};
}
export function getNodeDiff(newNode, oldNode) {
    const diff = {};
    if(!oldNode || !newNode) {
        diff.doesntExist = {
            n: !newNode,
            o: !oldNode,
        }
        return diff;
    }
    if(newNode.$$elementType !== oldNode.$$elementType) {
        diff.elementType = {
            n: newNode.$$elementType,
            o: oldNode.$$elementType,
        };
        return diff;
    }
    if(newNode.$$elementType === nodeType.TEXT_NODE && newNode.$$textContent !== oldNode.$$textContent) {
        diff.differentTexts = true;
        return diff;
    }
    if(newNode.$$type !== oldNode.$$type) {
        diff.type = {
            n: newNode.$$type,
            o: oldNode.$$type,
        };
        return diff;
    }
    if(newNode.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
        diff.fragment = createDiffingMap();
        const newKeyMap = getChildKeyPositionMap(newNode);
        const oldKeyMap = getChildKeyPositionMap(oldNode);

        Object.keys(oldKeyMap).forEach(key => {
            if(key in newKeyMap) {
                diff.fragment.existing.n[key] = newKeyMap[key];
                diff.fragment.existing.o[key] = oldKeyMap[key];
                return;
            }
            diff.fragment.removed[key] = oldKeyMap[key];
        });
        Object.keys(newKeyMap).forEach(key => {
            if(key in oldKeyMap) {
                return;
            }
            diff.fragment.added[key] = newKeyMap[key];
        });
    }
    return diff;
}
