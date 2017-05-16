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
    if (!Object.isFrozen(value)) {
      value = [...value];
      Object.freeze(value);
    }
    return value;
  }
}

export default ArrayResource;
