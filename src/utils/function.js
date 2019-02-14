function defer(fn, ...args) {
    if(fn) {
        setTimeout(fn.bind(null, ...args));
    }
}
function noop() {}
export {
    defer,
    noop
};
