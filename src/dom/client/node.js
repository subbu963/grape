import nodeType from '../../constants/node-type';

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

function create(node) {
    if(node.$node) {
        throw new Error('node is already attached to the dom.');
    }
    if(node.$$renderedComponent) {
        return node.$node = create(node.$$renderedComponent);
    }
    if(node.$$elementType === nodeType.TEXT_NODE) {
        return node.$node = document.createTextNode(node.$$textContent);
    }
    if(node.$$elementType === nodeType.PLACEHOLDER_NODE) {
        return node.$node = document.createDocumentFragment();
    }
    if(node.$$elementType === nodeType.DOCUMENT_FRAGMENT_NODE) {
        node.$node = document.createDocumentFragment();
        node.$node._children = [];
    } else {
        node.$node = document.createElement(node.$$type);
        setProps(node.$node, node.$$props);
    }
    node.$$children.forEach(child => {
        const $child = create(child);
        if(node.$$elementType === nodeType.DOCUMENT_FRAGMENT_NODE) {
            node.$node._children.push($child);
        }
        if(child.$$elementType === nodeType.DOCUMENT_FRAGMENT_NODE) {
            $child._parentNode = node.$node;
        }
        node.$node.appendChild($child);
    });
    return node.$node;
}
function doPostAttachTasks(node) {
    let $$children = node.$$children;
    if(node.$$elementType === nodeType.COMPONENT_NODE) {
        $$children = node.$$renderedComponent.$$children;
        node.$$componentInstance.mounted();
        node.$$componentInstance.setUpdateListener(() => {
            console.log('update called on', node);
        });
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
