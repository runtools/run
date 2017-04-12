import semver from 'semver';

import {throwUserError} from 'run-common';

export class Version {
  constructor(value) {
    this.value = value;
  }

  static create(str: string, {context}) {
    const version = semver.clean(str);
    if (!version) {
      throwUserError(`Version '${str}' is invalid`, {context});
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
