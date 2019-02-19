import nodeType from '../../constants/node-type';

export function create(node) {
    if(node.$$renderedComponent) {
        return create(node.$$renderedComponent);
    }
    if(node.$$elementType === nodeType.TEXT_NODE) {
        return document.createTextNode(node.$$textContent);
    }
    if(node.$$elementType === nodeType.PLACEHOLDER_NODE) {
        return document.createDocumentFragment();
    }
    let $node;
    if(node.$$elementType === nodeType.DOCUMENT_FRAGMENT_NODE) {
        $node = document.createDocumentFragment();
    } else {
        $node = document.createElement(node.$$type);
    }
    node.$$children.forEach(child => {
        $node.appendChild(create(child));
    });
    return $node;
}
