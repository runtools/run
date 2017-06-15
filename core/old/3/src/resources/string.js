import ValueResource from './value';

export class StringResource extends ValueResource {
  constructor(definition = {}, options) {
    if (typeof definition === 'string') {
      definition = {$value: definition};
    }
    super(definition, options);
  }

  static $normalizeValue(value) {
    if (typeof value !== 'string') {
      throw new Error('Invalid value type');
    }
    return value;
  }
}

export default StringResource;
