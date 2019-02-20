export default class Component {
    constructor(props, children) {
        this.props = props;
        this.children = children;
        this.state = {};
    }
    mounted(){
        console.log('mounted', this);
    }
    willUnmount(){}
    setUpdateListener(onUpdateListener) {
        this.onUpdate = onUpdateListener;
    }
    setState(stateUpdate) {
        this.state = Object.freeze(Object.assign({}, this.state, stateUpdate));
        this.onUpdate();
    }
    render() {
        return null;
    }
};
