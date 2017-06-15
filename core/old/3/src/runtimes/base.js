import VersionRange from '../version-range';

export class BaseRuntime {
  constructor(definition: {name: string}) {
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

export default BaseRuntime;
