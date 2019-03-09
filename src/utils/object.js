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
function createDiffingMap() {
    return {
        existing: {
            n: {},
            o: {}
        },
        removed: {},
        added: {}
    };
}
function objectDiff(n = {}, o = {}) {
    const diff = createDiffingMap();
    diff.existing.changed = {};
    for(const key in n) {
        if(key in o) {
            diff.existing.o[key] = o[key];
            diff.existing.n[key] = n[key];
            if(o[key] !== n[key]) {
                diff.existing.changed[key] = n[key];
            }
            continue;
        }
        diff.added[key] = n[key];
    }
    for(const key in o) {
        if(key in n) {
            continue;
        }
        diff.removed[key] = o[key];
    }
    return diff;
}
export {
    shallowMerge,
    createDiffingMap,
    objectDiff
};
