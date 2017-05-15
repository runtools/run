import ValueResource from './value';

export class NumberResource extends ValueResource {
  constructor(definition = {}, options) {
    if (typeof definition === 'number') {
      definition = {$value: definition};
    }
    super(definition, options);
  }

  static $normalizeValue(value) {
    if (typeof value !== 'number') {
      throw new Error('Invalid value type');
    }
    return value;
  }
}

export default NumberResource;
