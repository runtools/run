import {entries} from 'lodash';
import {compactObject, throwUserError, formatCode} from 'run-common';

export class Option {
  constructor(option) {
    Object.assign(this, option);
  }

  static create(definition, {defaultName, context}) {
    if (definition === undefined) {
      throw new Error("'definition' argument is missing");
    }

    if (typeof definition === 'string') {
      definition = {name: definition};
    }

    if (typeof definition !== 'object') {
      throwUserError(`Option definition must be a string or an object`, {context});
    }

    const name = definition.name || defaultName;
    if (!name) {
      throwUserError(`Option ${formatCode('name')} property is missing`, {context});
    }

    const option = new this({
      name,
      default: definition.default
    });

    return option;
  }

  toJSON() {
    let json = compactObject(this);
    if (Object.keys(json).length === 1) {
      // If there is only one property, it must be the name and we can simplify the JSON
      json = json.name;
    }
    return json;
  }

  static createMany(definitions, {context}) {
    if (!definitions) {
      throw new Error("'definitions' argument is missing");
    }

    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(definition, {context}));
    }

    return entries(definitions).map(([name, definition]) => {
      if (definition !== null && typeof definition !== 'object') {
        definition = {default: definition};
      }
      return this.create(definition, {defaultName: name, context});
    });
  }
}

export default Option;
