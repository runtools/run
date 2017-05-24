import {cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';

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
}

export default ArrayResource;
