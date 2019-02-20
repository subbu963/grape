import TYPE from '../constants/type';

function getType(variable) {
    const type = typeof variable;
    if(TYPE[type] === TYPE.object) {
        if(variable === null) {
            return TYPE.null;
        }
        if(variable.constructor) {
            return variable.constructor.name;
        }
    }
    return TYPE[type];
}
function isString(variable) {
    return getType(variable) === TYPE.string;
}
function isNumber(variable) {
    return getType(variable) === TYPE.number;
}
function isBoolean(variable) {
    return getType(variable) === TYPE.boolean;
}
function isFunction(variable) {
    return getType(variable) === TYPE.function;
}
function isArray(variable) {
    return Array.isArray(variable);
}
function areDifferentTypes(a, b) {
    return getType(a) !== getType(b);
}
function isDefined(variable) {
    return getType(variable) !== TYPE.undefined;
}
function isUnDefined(variable) {
    return getType(variable) === TYPE.undefined;
}
function isNull(variable) {
    return getType(variable) !== TYPE.null;
}
function isObject(variable) {
    return variable instanceof Object;
}
function isComponentNode(variable) {
    return variable && variable.$$component;
}
function isTextNode(variable) {
    return variable instanceof Text;
}
export {
    getType,
    isString,
    isFunction,
    isArray,
    areDifferentTypes,
    isDefined,
    isNull,
    isObject,
    isComponentNode,
    isNumber,
    isBoolean,
    isTextNode,
    isUnDefined
};
