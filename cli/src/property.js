import {entries, isPlainObject} from 'lodash';
import {compactObject, throwUserError, formatCode} from 'run-common';

export class Property {
  constructor(property) {
    Object.assign(this, property);
  }

  static create(definition: Object | string, {defaultName, context}) {
    if (typeof definition === 'string') {
      definition = {name: definition};
    }

    const name = definition.name || defaultName;
    if (!name) {
      throwUserError(`Property ${formatCode('name')} property is missing`, {context});
    }

    const property = new this({
      name,
      default: definition.default
    });

    return property;
  }

  toJSON() {
    let json = compactObject(this);
    if (Object.keys(json).length === 1) {
      // If there is only one property, it must be the name and we can simplify the JSON
      json = json.name;
    }
    return json;
  }

  static createMany(definitions: Array | Object, {context}) {
    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(definition, {context}));
    }

    return entries(definitions).map(([name, definition]) => {
      if (!isPlainObject(definition)) {
        definition = {default: definition};
      }
      return this.create(definition, {defaultName: name, context});
    });
  }
}

export default Property;
