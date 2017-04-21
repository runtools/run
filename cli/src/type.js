import {resolve} from 'path';
import {formatString, formatCode} from 'run-common';

const SUPPORTED_TYPES = ['boolean', 'number', 'string', 'path', 'array'];

export class Type {
  constructor(definition: ?Object | ?string = 'string') {
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

    this.name = definition.name;
    this.contentTypeName = definition.contentTypeName;
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    name = name.trim();
    this.rejectInvalidNames(name);
    this._name = name;
  }

  get contentTypeName() {
    return this._contentTypeName;
  }

  set contentTypeName(name: ?string) {
    if (name !== undefined) {
      name = name.trim();
      this.rejectInvalidNames(name);
    }
    this._contentTypeName = name;
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

  rejectInvalidNames(name: string) {
    if (!SUPPORTED_TYPES.includes(name)) {
      throw new Error(`Unsupported type: ${formatString(name)}`);
    }
  }

  static infer(value) {
    if (value === undefined) {
      return 'string';
    }

    const type = typeof value;
    if (type === 'boolean' || type === 'number' || type === 'string') {
      return type;
    }

    if (Array.isArray(value)) {
      const array = value;
      let type = 'array';
      if (array.length) {
        const contentType = this.infer(array[0]);
        if (contentType) {
          type += '<' + contentType + '>';
        }
      }
      return type;
    }

    throw new Error(`Cannot infer type from value: ${formatCode(value)}`);
  }

  convert(value: string | Array<string>, {dir} = {}) {
    let result;

    if (this.name === 'array') {
      if (!Array.isArray(value)) {
        throw new Error('Cannot convert a value to an array');
      }
      result = value.map(string => this._convert(string, this.contentTypeName, {dir}));
    } else {
      result = this._convert(value, this.name, {dir});
    }

    return result;
  }

  _convert(string: string, typeName: string, {dir}) {
    let result;

    if (typeName === 'boolean') {
      const str = string.toLowerCase();
      if (str === '1' || str === 'true' || str === 'yes' || str === 'on') {
        result = true;
      } else if (str === '0' || str === 'false' || str === 'no' || str === 'off') {
        result = false;
      } else {
        throw new Error(`Cannot convert a string to a boolean: ${formatString(string)}`);
      }
    } else if (typeName === 'number') {
      result = Number(string);
      if (isNaN(result)) {
        throw new Error(`Cannot convert a string to a number: ${formatString(string)}`);
      }
    } else if (typeName === 'string') {
      result = string;
    } else if (typeName === 'path') {
      if (!dir) {
        throw new Error("'dir' argument is missing");
      }
      result = resolve(dir, string);
    } else {
      throw new Error(`Unimplemented type: ${formatCode(typeName)}`);
    }

    return result;
  }

  isArray() {
    return this.name === 'array';
  }
}

export default Type;
