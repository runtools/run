import ValueResource from './value';

export class BooleanResource extends ValueResource {
  constructor(definition = {}, options) {
    if (typeof definition === 'boolean') {
      definition = {$value: definition};
    }
    super(definition, options);
  }

  static $normalizeValue(value) {
    if (typeof value !== 'boolean') {
      throw new Error('Invalid value type');
    }
    return value;
  }
}

export default BooleanResource;
