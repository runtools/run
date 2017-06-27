import semver from 'semver';
import {formatString} from 'run-common';

export class Version {
  constructor(str) {
    const value = semver.clean(str);
    if (!value) {
      throw new Error(`Version ${formatString(str)} is invalid`);
    }
    this.value = value;
  }

  toJSON() {
    return this.toString();
  }

  toString() {
    return this.value;
  }
}

export default Version;
