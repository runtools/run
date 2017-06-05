import {isPlainObject, cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';
import JSON5 from 'json5';
import {formatString} from 'run-common';

import ValueResource from './value';

export class ObjectResource extends ValueResource {
  constructor(definition = {}, options) {
    super(definition, options);
    if (!('$value' in definition)) {
      let value;
      for (const name of Object.keys(definition)) {
        if (name.startsWith('$')) continue;
        if (value === undefined) value = {};
        value[name] = definition[name];
      }
      if (value) {
        this.$value = value;
      }
    }
  }

  static $normalizeValue(value) {
    if (!isPlainObject(value)) {
      throw new Error('Invalid value type');
    }
    value = cloneDeep(value);
    deepFreeze(value);
    return value;
  }

  static $parseValue(str) {
    let object;
    try {
      object = JSON5.parse(str);
    } catch (err) {
      // NOOP
    }
    if (!isPlainObject(object)) {
      throw new Error(`Cannot convert a string to an object: ${formatString(str)}`);
    }
    return object;
  }
}

export default ObjectResource;
