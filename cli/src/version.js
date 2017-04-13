import semver from 'semver';

export class Version {
  constructor(value) {
    this.value = value;
  }

  static create(str: string) {
    const version = semver.clean(str);
    if (!version) {
      throw new Error(`Version '${str}' is invalid`);
    }

    return new this(version);
  }

  toJSON() {
    return this.toString();
  }

  toString() {
    return this.value;
  }
}

export default Version;
