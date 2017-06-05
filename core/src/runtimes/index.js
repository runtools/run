import {formatString} from 'run-common';

import VersionRange from '../version-range';

export class Runtime {
  constructor(definition: {name: string}) {
    this.name = definition.name;
    this.version = new VersionRange(definition.version);
  }

  static create(definition: {name: string} | string) {
    if (typeof definition === 'string') {
      const [name, version] = definition.split('@');
      definition = {name, version};
    }

    const Runtime = this.getRuntimeClass(definition.name);
    return new Runtime(definition);
  }

  static getRuntimeClass(name) {
    switch (name) {
      case 'node':
        return require('./node').default;
      default:
        throw new Error(`Unimplemented runtime: ${formatString(name)}`);
    }
  }

  toJSON() {
    let json = this.name;
    const version = this.version.toString();
    if (version) {
      json += '@' + version;
    }
    return json;
  }
}

export default Runtime;
