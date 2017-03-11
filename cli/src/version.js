import semver from 'semver';

import {createUserError} from 'run-shared';

export class Version {
  constructor(value) {
    this.value = value;
  }

  static create(str) {
    if (!str) {
      throw new Error("'str' parameter is missing");
    }

    let version = semver.clean(str);
    if (!version) {
      throw createUserError(`Version '${str}' is invalid`);
    }

    return new this(version);
  }

  toString() {
    return this.value;
  }
}

export default Version;
