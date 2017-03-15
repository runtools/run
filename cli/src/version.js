import semver from 'semver';

import {throwUserError} from 'run-common';

export class Version {
  constructor(value) {
    this.value = value;
  }

  static create(str, context) {
    if (!str) {
      throw new Error("'str' parameter is missing");
    }

    let version = semver.clean(str);
    if (!version) {
      throwUserError(`Version '${str}' is invalid`, {context});
    }

    return new this(version);
  }

  toString() {
    return this.value;
  }
}

export default Version;
