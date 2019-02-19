import {isString, isNumber, isArray, isDefined, isFunction} from '../utils/type';
import {toString} from '../utils/string';
import nodeType from '../constants/node-type';
import Component from '../classes/component';

const PLACEHOLDER_POSSIBLE_VALUES = new Set([null, undefined, false, '']);


export function createVirtualNode(type, props, ...children) {
    const node = {
        $$type: type
    };
    if(type) {
        if(isFunction(type)) {
            if(Component.isPrototypeOf(type)) {
                node.$$elementType = nodeType.COMPONENT_NODE;
                node.$$componentInstance = new node.$$type(node.$$props, node.$$children);
                node.$$renderedComponent = node.$$componentInstance.render();
                if(node.$$renderedComponent) {
                    if(node.$$renderedComponent.$$children) {
                        node.$$renderedComponent.$$children = node.$$renderedComponent.$$children.map(child => {
                            if(Component.isPrototypeOf(child.$$type)) {
                                return createVirtualNode(child.$$type, child.$$props, child.$$children);
                            }
                            return child;
                        });
                    }
                    if(Component.isPrototypeOf(node.$$renderedComponent.$$type)) {
                        node.$$renderedComponent = new node.$$renderedComponent.$$type(node.$$renderedComponent.$$props, node.$$renderedComponent.$$children);
                        node.$$renderedComponent = node.$$renderedComponent.render();
                    }
                }
            }
        } else {
            node.$$elementType = nodeType.ELEMENT_NODE;
        }
    }
    if(props) {
        node.$$props = props;
    }
    if(children) {
        node.$$children = children.map(child => {
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
                    $$elementType: nodeType.DOCUMENT_FRAGMENT_NODE,
                    $$children: child
                };
            }
            return {
                $$elementType: nodeType.TEXT_NODE,
                $$textContent: child
            };
        });
    }
    return node;
}
function getChildKeyPositionMap(node) {
    return node.$$children.reduce((acc, child, idx) => {
        acc[child.$$props.key] = idx;
    }, {});
}
export function diff(newNode, oldNode) {
    const diff = {
        $equal: false,
        $type: false,
        $props: false,
        $elementType: false,
        $fragment: false
    };
    if(newNode === oldNode) {
        diff.$equal = true;
        return diff;
    }
    if(newNode.$$elementType !== oldNode.$$elementType) {
        diff.$elementType = {
            o: oldNode.$elementType,
            n: newNode.$elementType
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
    if(newNode.$$elementType === nodeType.DOCUMENT_FRAGMENT_NODE) {
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
