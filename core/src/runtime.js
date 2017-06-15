import VersionRange from './version-range';

export class Runtime {
  constructor(definition) {
    if (typeof definition === 'string') {
      const [name, version] = definition.split('@');
      definition = {name, version};
    }

    this.name = definition.name;
    this.version = new VersionRange(definition.version);
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
