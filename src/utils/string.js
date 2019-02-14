import {getType} from './type';
import TYPE from '../constants/type';

function toLowerCase(str) {
    return String.prototype.toLowerCase.call(str);
}
function toUpperCase(str) {
    return String.prototype.toUpperCase.call(str);
}
function upperFirst(str) {
    try {
        return toUpperCase(str[0]) + toLowerCase(str.substr(1));
    } catch(e) {
        return str;
    }
}
function toString(variable) {
    const type = getType(variable);
    if(TYPE.string === TYPE[type]) {
        return variable;
    }
    if(TYPE.null === TYPE[type] || TYPE.undefined === TYPE[type]) {
        return '';
    }
    if(TYPE.array === TYPE[type]) {
        return variable.map((val) => toString(val)).join();
    }
    if(TYPE.symbol === TYPE[type]) {
        return variable.toString();
    }
    if(TYPE.number === TYPE[type] && 1 / variable === Number.NEGATIVE_INFINITY) {
        return '-0';
    }
    return `${variable}`;
}
export {
    toLowerCase,
    upperFirst,
    toString
};
