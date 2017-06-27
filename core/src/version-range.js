import {compact} from 'lodash';
import semver from 'semver';

import {formatString} from 'run-common';

export class VersionRange {
  constructor(str = '') {
    // '': All versions
    // '1.2.0': Exact version
    // '^1.0.0': Caret range
    // '~1.0.0': Tilde range
    // '<1.0.0':  Before range
    // '>=1.5.0':  After range
    // '>=1.0.0 <2.0.0':  Between range
    // '^1.0.0 !1.2.3': Range with an exclusion

    str = str.trim();

    if (str === '') {
      this.type = 'any';
      return;
    }

    const exactVersion = semver.clean(str);
    if (exactVersion) {
      // '0.3.2', '2.3.1-beta',...
      this.type = 'exact';
      this.value = exactVersion;
      return;
    }

    const error = new Error(`Version range ${formatString(str)} is invalid`);

    const parts = [];
    const exclusions = [];
    for (const part of compact(str.split(' '))) {
      if (part.startsWith('!')) {
        const exclusion = semver.clean(part.substr(1));
        if (!exclusion) {
          throw error;
        }
        exclusions.push(exclusion);
      } else {
        parts.push(part);
      }
    }

    if (parts.length > 2) {
      throw error;
    }

    let type;
    if (parts[0].startsWith('~')) {
      if (parts.length > 1) {
        throw error;
      }
      type = 'tilde';
    } else if (parts[0].startsWith('^')) {
      if (parts.length > 1) {
        throw error;
      }
      type = 'caret';
    } else if (parts[0].startsWith('<')) {
      if (parts.length > 1) {
        throw error;
      }
      type = 'before';
    } else if (parts[0].startsWith('>')) {
      if (parts.length === 1) {
        type = 'after';
      } else {
        if (!parts[1].startsWith('<')) {
          throw error;
        }
        type = 'between';
      }
    } else {
      throw error;
    }

    const value = parts.join(' ');

    if (!semver.validRange(value)) {
      throw error;
    }

    this.type = type;
    this.value = value;
    this.exclusions = exclusions;
  }

  toString() {
    if (this.type === 'any') {
      return '';
    }
    let str = this.value;
    if (this.type === 'exact') {
      return str;
    }
    for (const exclusion of this.exclusions) {
      str += ' !' + exclusion;
    }
    return str;
  }

  toJSON() {
    const str = this.toString();
    return str ? str : undefined;
  }

  includes(version) {
    version = semver.clean(version);
    if (!version) {
      throw new Error(`Version ${formatString(version)} is invalid`);
    }

    if (this.type === 'any') {
      return true;
    }

    if (!semver.satisfies(version, this.value)) {
      return false;
    }

    if (this.exclusions && this.exclusions.includes(version)) {
      return false;
    }

    return true;
  }
}

export default VersionRange;
