import {join} from 'path';
import {existsSync} from 'fs';
import {throwUserError, formatPath} from 'run-common';

export class Engine {
  constructor(engine) {
    Object.assign(this, engine);
  }

  static create(definition: {name: string} | string, {context}) {
    if (typeof definition === 'string') {
      const [name, version] = definition.split('@');
      definition = {name, version};
    }

    if (!existsSync(join(__dirname, definition.name + '.js'))) {
      throwUserError(`Engine not found: ${formatPath(definition.name)}`, {context});
    }

    return require('./' + definition.name).default.create(definition, {context});
  }

  toJSON() {
    let engine = this.name;
    const version = this.version.toString();
    if (version) {
      engine += '@' + version;
    }
    return engine;
  }
}

export default Engine;
