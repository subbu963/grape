import {mount as mountNode} from './node';
import {GRAPE_ROOT_ATTR} from '../../constants/attr';

export default function mount($parent, node) {
    const firstChild = $parent.firstChild;
    const shouldHydrate = firstChild && firstChild.hasAttribute(GRAPE_ROOT_ATTR);
    mountNode($parent, node, shouldHydrate);
}
