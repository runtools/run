import {isPlainObject, cloneDeep} from 'lodash';
import deepFreeze from 'deep-freeze';

import ValueResource from './value';

export class ObjectResource extends ValueResource {
  constructor(definition = {}, options) {
    super(definition, options);
    if (!('$value' in definition)) {
      let value;
      for (const id of Object.keys(definition)) {
        if (id.startsWith('$')) continue;
        if (value === undefined) value = {};
        value[id] = definition[id];
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
}

export default ObjectResource;
