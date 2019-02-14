function shallowMerge(dest, ...srcs) {
    for(const src of srcs) {
        if(!src) {
            continue;
        }
        for(const [key, value] of Object.entries(src)) {
            dest[key] = value;
        }
    }
    return dest;
}
export {
    shallowMerge
};
