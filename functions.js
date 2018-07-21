const isPresentType = (type) => (value) => {
    //string, number, boolean, object, array, function
    const isType = (typeof value === type);

    if (type === 'string') {
        return (isType && value.length > 0);
    } else if (type === 'number') {
        return (isType && !Number.isNaN(value));
    } else if (type === 'array') {
        return (Array.isArray(value) && value.length > 0);
    } else if (type === 'boolean' || type === 'function' || type === 'object') {
        return isType;
    }
};

const isNumber = isPresentType('number');
const isArray = isPresentType('array');
const isString = isPresentType('string');
const isObject = isPresentType('object');
const isBoolean = isPresentType('boolean');
const isFunction = isPresentType('function');



module.exports = {
    isPresentType
    , isArray
    , isBoolean
    , isFunction
    , isNumber
    , isObject
    , isString
};
