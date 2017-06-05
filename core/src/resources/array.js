import {cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';
import JSON5 from 'json5';
import {formatString} from 'run-common';

import ValueResource from './value';

export class ArrayResource extends ValueResource {
  constructor(definition = {}, options) {
    if (Array.isArray(definition)) {
      definition = {$value: definition};
    }
    super(definition, options);
  }

  static $normalizeValue(value) {
    if (!Array.isArray(value)) {
      throw new Error('Invalid value type');
    }
    value = cloneDeep(value);
    deepFreeze(value);
    return value;
  }

  static $parseValue(str) {
    let array;
    try {
      array = JSON5.parse(str);
    } catch (err) {
      // NOOP
    }
    if (!Array.isArray(array)) {
      throw new Error(`Cannot convert a string to an array: ${formatString(str)}`);
    }
    return array;
  }
}

export default ArrayResource;
