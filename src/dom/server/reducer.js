import nodeType from '../../constants/node-type';
import {GRAPE_ROOT_ATTR} from '../../constants/attr';
import {GRAPE_TEXT_SEPARATOR} from '../../constants/element';
import {toString} from '../../utils/string';
import {isString} from '../../utils/type';
import {getDeepElementType} from '../../vdom/node';

const GRAPE_TEXT_SEPARATOR_COMMENT = `<!--${GRAPE_TEXT_SEPARATOR}-->`;
function getChildSeparator(prevNode, curNode) {
    if(getDeepElementType(prevNode) === nodeType.TEXT_NODE && getDeepElementType(curNode) === nodeType.TEXT_NODE) {
        return GRAPE_TEXT_SEPARATOR_COMMENT;
    }
    return '';
}
function childrenToString(children) {
    return children.reduce((acc, child, idx) => {
        return `${acc}${getChildSeparator(children[idx - 1], child)}${reduceNodeToString(child)}`;
    }, '');
}
export default function reduceNodeToString(node, isRoot = false) {
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        return reduceNodeToString(node.$$renderedComponent, isRoot);
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
    const props = Object.assign({}, node.$$props && node.$$props.textProps, isRoot && {[GRAPE_ROOT_ATTR]: ''});
    const propStr = Object.entries(props).map(([attr, value]) => `${attr}="${value}"`).join(' ');
    if(node.$$isSelfClosing) {
        return `<${node.$$type}${propStr ? ` ${propStr}` : ''}/>`;
    }
    return `<${node.$$type}${propStr ? ` ${propStr}` : ''}>${childrenToString(node.$$children)}</${node.$$type}>`;
};
