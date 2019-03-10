import nodeType from '../../constants/node-type';
import {toString} from '../../utils/string';

export default function reduceNodeToString(node) {
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return reduceNodeToString(node.$$renderedComponent);
    }
    if(node.$$elementType === nodeType.TEXT_NODE) {
        return `${toString(node.$$textContent)}<!--grape-text-->`;
    }
    if(node.$$elementType === nodeType.PLACEHOLDER_NODE) {
        return '';
    }
    if(node.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
        return node.$$children.reduce((acc, child) => acc + reduceNodeToString(child), '');
    }
    const propStr = node.$$props && Object.entries(node.$$props.textProps).map(([attr, value]) => `${attr}="${value}"`).join(' ');
    if(node.$$isSelfClosing) {
        return `<${node.$$type}${propStr ? ` ${propStr}` : ''}/>`;
    }
    const childrenStr = node.$$children.reduce((acc, child) => acc + reduceNodeToString(child), '');
    return `<${node.$$type}${propStr ? ` ${propStr}` : ''}>${childrenStr}</${node.$$type}>`;
};
