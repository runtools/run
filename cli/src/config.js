import {mapValues} from 'lodash';

class Property {
  constructor(property) {
    Object.assign(this, property);
  }

  static create(definition, _context) {
    if (!definition) {
      throw new Error("'definition' parameter is missing");
    }

    if (typeof definition !== 'object') {
      definition = {default: definition};
    }

    return new this(definition);
  }
}

export class Config {
  constructor(properties) {
    this.properties = properties;
  }

  static create(definitions, context) {
    if (!definitions) {
      throw new Error("'definitions' parameter is missing");
    }

    const properties = mapValues(definitions, definition => Property.create(definition, context));

    return new this(properties);
  }

  getDefaults() {
    return mapValues(this.properties, property => property.default);
  }
}

export default Config;
