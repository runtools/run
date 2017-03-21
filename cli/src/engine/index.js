import {join} from 'path';
import {existsSync} from 'fs';
import {throwUserError, formatCode, formatPath} from 'run-common';

export class Engine {
  constructor(engine) {
    Object.assign(this, engine);
  }

  static create(definition, context) {
    if (!definition) {
      throw new Error("'definition' property is missing");
    }

    let engine = definition;

    if (typeof engine === 'string') {
      const [name, version] = engine.split('@');
      engine = {name, version};
    }

    if (!engine.name) {
      throwUserError(`Engine ${formatCode('name')} property is missing`, {context});
    }

    if (!existsSync(join(__dirname, engine.name + '.js'))) {
      throwUserError(`Engine ${formatPath(engine.name)} is not supported`, {context});
    }

    return require('./' + engine.name).default.create(engine, context);
  }
}

export default Engine;
