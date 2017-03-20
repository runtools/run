import {entries} from 'lodash';
import {throwUserError, formatCode} from 'run-common';

export class Parameter {
  constructor(param) {
    Object.assign(this, param);
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
      throwUserError(`Parameter ${formatCode('name')} property is missing`, {context});
    }

    const param = new this({
      name,
      default: definition.default
    });

    return param;
  }

  static createMany(objs, context) {
    if (!objs) {
      throw new Error("'objs' parameter is missing");
    }

    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(obj, context));
    }

    return entries(objs).map(([name, obj]) => this.create(obj, context, name));
  }
}

export default Parameter;
