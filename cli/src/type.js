import {resolve} from 'path';
import {throwUserError, formatString, formatCode} from 'run-common';

const SUPPORTED_TYPES = ['boolean', 'number', 'string', 'path', 'array'];

export class Type {
  constructor(param) {
    Object.assign(this, param);
  }

  static create(definition, {context}) {
    if (definition === undefined) {
      throw new Error("'definition' argument is missing");
    }

    if (typeof definition === 'string') {
      let name = definition;
      let contentTypeName;
      if (name.startsWith('array')) {
        const matches = name.match(/^Array<(\w+)>$/i);
        contentTypeName = (matches && matches[1]) || 'string';
        name = 'array';
      }
      definition = {name, contentTypeName};
    }

    if (typeof definition !== 'object') {
      throwUserError(`Type definition must be a string or an object`, {context});
    }

    const {name, contentTypeName} = definition;
    this.validateName(name, {context});
    if (contentTypeName) {
      this.validateName(contentTypeName, {context});
    }

    return new this({name, contentTypeName});
  }

  static validateName(name, {context}) {
    if (!SUPPORTED_TYPES.includes(name)) {
      throwUserError(`Unsupported type: ${formatString(name)}`, {context});
    }
  }

  static infer(value, {context}) {
    if (value === undefined) {
      throw new Error("'value' argument is missing");
    }

    const type = typeof value;
    if (type === 'boolean' || type === 'number' || type === 'string') {
      return type;
    }

    if (Array.isArray(value)) {
      const array = value;
      let type = 'array';
      if (array.length) {
        const contentType = this.infer(array[0], {context});
        if (contentType) {
          type += '<' + contentType + '>';
        }
      }
      return type;
    }

    throwUserError(`Cannot infer type from value: ${formatCode(value)}`, {context});
  }

  toJSON() {
    if (this.name === 'string') {
      return undefined;
    }

    if (this.contentTypeName && this.contentTypeName !== 'string') {
      return this.name + '<' + this.contentTypeName + '>';
    }

    return this.name;
  }

  convert(stringOrArray, {dir, context}) {
    let result;

    if (this.name === 'array') {
      if (!Array.isArray(stringOrArray)) {
        throwUserError('Cannot convert a value to an array', {context});
      }
      result = stringOrArray.map(string =>
        this._convert(string, this.contentTypeName, {dir, context}));
    } else {
      result = this._convert(stringOrArray, this.name, {dir, context});
    }

    return result;
  }

  _convert(string, typeName, {dir, context}) {
    if (!string) {
      throw new Error("'string' argument is missing");
    }

    if (typeof string !== 'string') {
      throw new Error("'string' argument must be a string");
    }

    if (!typeName) {
      throw new Error("'typeName' argument is missing");
    }

    let result;

    if (typeName === 'boolean') {
      const str = string.toLowerCase();
      if (str === '1' || str === 'true' || str === 'yes' || str === 'on') {
        result = true;
      } else if (str === '0' || str === 'false' || str === 'no' || str === 'off') {
        result = false;
      } else {
        throwUserError(`Cannot convert a string to a boolean: ${formatString(string)}`, {
          context
        });
      }
    } else if (typeName === 'number') {
      result = Number(string);
      if (isNaN(result)) {
        throwUserError(`Cannot convert a string to a number: ${formatString(string)}`, {
          context
        });
      }
    } else if (typeName === 'string') {
      result = string;
    } else if (typeName === 'path') {
      if (!dir) {
        throw new Error("'dir' argument is missing");
      }
      result = resolve(dir, string);
    } else {
      throwUserError(`Unimplemented type: ${formatCode(typeName)}`, {context});
    }

    return result;
  }

  isArray() {
    return this.name === 'array';
  }
}

export default Type;
