import {mount} from './dom/client/mount';
import {createVirtualNode, diff} from './vdom/node';

export default {
    createVirtualNode,
    mount,
    diff
};
export {default as Component} from './classes/component';
