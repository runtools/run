import {cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';

import ValueResource from './value';

export class ArrayResource extends ValueResource {
  static $RESOURCE_TYPE = 'array';

  static $normalizeValue(value) {
    if (!Array.isArray(value)) {
      throw new Error('Invalid value type');
    }
    value = cloneDeep(value);
    deepFreeze(value);
    return value;
  }

  static $normalize(definition, options) {
    if (Array.isArray(definition)) {
      definition = {'@value': definition};
    }
    return super.$normalize(definition, options);
  }

  static $parse(str) {
    if (!str) {
      return [];
    }
    return str.split(',');
  }
}

export default ArrayResource;
