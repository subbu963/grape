import {HTML_ATTRIBUTES, SVG_ATTRIBUTES} from '../constants/attr';

function isDataAttr(attr) {
    return attr.startsWith('data-');
}
function isSVGAttr(attr) {
    return SVG_ATTRIBUTES.has(attr);
}
function isHTMLAttr(attr) {
    return HTML_ATTRIBUTES.has(attr) || isDataAttr(attr);
}
function isCustomAttr(attr) {
    return !isHTMLAttr(attr) && !isSVGAttr(attr);
}
export {
    isSVGAttr,
    isHTMLAttr,
    isCustomAttr
};
