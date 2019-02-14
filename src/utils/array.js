const _slice = [].slice;

function slice(arr, start, end) {
    return _slice.call(arr, start, end);
}
export {
    slice
};
