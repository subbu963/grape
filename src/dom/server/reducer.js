import nodeType from '../../constants/node-type';
import {toString} from '../../utils/string';
import {isString} from '../../utils/type';
import {getDeepElementType} from '../../vdom/node';

function childrenToString(children) {
    return children.reduce((acc, child, idx) => {
        let sep = '';
        if(getDeepElementType(children[idx - 1]) === nodeType.TEXT_NODE && getDeepElementType(child) === nodeType.TEXT_NODE) {
            sep = '<!--grape-sep-->';
        }
        return `${acc}${sep}${reduceNodeToString(child)}`;
    }, '');
}
export default function reduceNodeToString(node) {
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return reduceNodeToString(node.$$renderedComponent);
    }
    if(node.$$elementType === nodeType.TEXT_NODE) {
        return toString(node.$$textContent);
    }
    if(node.$$elementType === nodeType.PLACEHOLDER_NODE) {
        return '';
    }
    if(node.$$elementType === nodeType.ARRAY_FRAGMENT_NODE) {
        return childrenToString(node.$$children);
    }
    const propStr = node.$$props && Object.entries(node.$$props.textProps).map(([attr, value]) => `${attr}="${value}"`).join(' ');
    if(node.$$isSelfClosing) {
        return `<${node.$$type}${propStr ? ` ${propStr}` : ''}/>`;
    }
    return `<${node.$$type}${propStr ? ` ${propStr}` : ''}>${childrenToString(node.$$children)}</${node.$$type}>`;
};
