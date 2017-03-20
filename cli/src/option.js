import {entries} from 'lodash';
import {throwUserError, formatCode} from 'run-common';

export class Option {
  constructor(option) {
    Object.assign(this, option);
  }

  static create(definition, context, defaultName) {
    if (!definition) {
      throw new Error("'definition' parameter is missing");
    }

    if (typeof definition !== 'object') {
      definition = {default: definition};
    }

    const name = definition.name || defaultName;
    if (!name) {
      throwUserError(`Option ${formatCode('name')} property is missing`, {context});
    }

    const option = new this({
      name,
      default: definition.default
    });

    return new this(option);
  }

  static createMany(definitions, context) {
    if (!definitions) {
      throw new Error("'definitions' parameter is missing");
    }

    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(definition, context));
    }

    return entries(definitions).map(([name, definition]) => this.create(definition, context, name));
  }
}

export default Option;
