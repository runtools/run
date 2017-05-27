import {cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';
import {formatString} from 'run-common';

import ValueResource from './value';

export class ArrayResource extends ValueResource {
  constructor(definition = {}, options) {
    if (Array.isArray(definition)) {
      definition = {$value: definition};
    }
    super(definition, options);
  }

  static $normalizeValue(value, {parse} = {}) {
    if (typeof value === 'string' && parse) {
      let array;
      try {
        array = JSON.parse(value);
      } catch (err) {
        // NOOP
      }
      if (!Array.isArray(value)) {
        throw new Error(`Cannot convert a string to an array: ${formatString(value)}`);
      }
      deepFreeze(array);
      return array;
    }

    if (!Array.isArray(value)) {
      throw new Error('Invalid value type');
    }

    value = cloneDeep(value);
    deepFreeze(value);
    return value;
  }
}

export default ArrayResource;
