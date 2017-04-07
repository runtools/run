import {entries, isPlainObject} from 'lodash';
import {compactObject, throwUserError, formatCode} from 'run-common';

import Type from './type';

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
      throwUserError(`Option ${formatCode('definition')} must be a string or an object`, {
        context
      });
    }

    const name = definition.name || defaultName;
    if (!name) {
      throwUserError(`Option ${formatCode('name')} property is missing`, {context});
    }

    const defaultValue = definition.default;

    let type;
    if (definition.type) {
      type = definition.type;
    } else if (defaultValue !== undefined) {
      type = Type.infer(defaultValue, {context});
    } else {
      type = 'string';
    }

    const option = new this({
      name,
      type: Type.create(type, {context}),
      default: defaultValue
    });

    return option;
  }

  toJSON() {
    let json = {
      name: this.name,
      type: this.type.toJSON(),
      default: this.default
    };
    json = compactObject(json);
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
      if (!isPlainObject(definition)) {
        definition = {default: definition};
      }
      return this.create(definition, {defaultName: name, context});
    });
  }
}

export default Option;
