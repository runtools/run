import pick from 'lodash.pick';
import semver from 'semver';

import Hook from './hook';
import Config from './config';

export class ToolReference {
  constructor(toolRef) {
    Object.assign(this, pick(toolRef, ['name', 'version', 'hooks', 'config']));
  }

  static normalize(toolRef) {
    if (!toolRef) {
      throw new Error("'toolRef' parameter is missing");
    }

    let normalizedToolRef = {
      name: this.normalizeName(toolRef.name),
      version: this.normalizeVersion(toolRef.version),
      hooks: Hook.normalizeMany(toolRef.hooks),
      config: Config.normalize(toolRef.config)
    };

    normalizedToolRef = new this(normalizedToolRef);

    return normalizedToolRef;
  }

  static normalizeMany(toolRefs) {
    const normalizedToolRefs = [];

    if (!toolRefs) {
      toolRefs = {};
    }

    for (const name of Object.keys(toolRefs)) {
      let toolRef = toolRefs[name];
      if (typeof toolRef === 'string') {
        toolRef = {version: toolRef};
      }
      toolRef.name = name;
      const normalizedToolRef = this.normalize(toolRef);
      normalizedToolRefs.push(normalizedToolRef);
    }

    return normalizedToolRefs;
  }

  static normalizeName(name) {
    if (!name) {
      throw new Error('ToolReference name property is missing');
    }

    if (/[^a-z0-9.@/_]/i.test(name)) {
      throw new Error(`ToolReference name '${name}' is invalid`);
    }

    if (name.startsWith('/') || name.includes('..')) {
      // Safety precaution
      throw new Error(`ToolReference name '${name}' is invalid`);
    }

    return name;
  }

  static normalizeVersion(version) {
    // falsy value => 'latest'
    // 'beta' => 'beta'
    // '2.0.2' => '2.0.2'
    // '^0.5.1' => '0.5.x'
    // '~1.0.3' => '1.1.x'
    // '^1.3.3-beta' => '1.x.x-beta'

    if (!version) {
      return 'latest';
    }

    if (/^[a-z]+$/i.test(version)) {
      return version; // Tag ('latest', 'beta',...)
    }

    const strictVersion = semver.clean(version);
    if (strictVersion) {
      return strictVersion; // Strict version ('0.3.2', '2.3.1-beta',...)
    }

    const range = semver.validRange(version); // Return something like '>=1.3.3 <2.0.0'...
    if (!range) {
      throw new Error(`Version range '${version}' is invalid`);
    }

    if (/^[0-9a-z.-]+$/i.test(version)) {
      return version; // Should be something like '0.2.x' or '1.x.x-beta'
    }

    let type;
    if (version.startsWith('^')) {
      type = 'caret';
    } else if (version.startsWith('~')) {
      type = 'tilde';
    } else {
      throw new Error(
        `Version range '${version}' is not supported. Use caret, tilde or 1.x.x range types.`
      );
    }

    version = range.split(' ')[0].slice(2);
    // Let's find out the minimum compatible version:
    // For caret: 1.7.8 => 1.0.0 but 0.5.9 => 0.5.0
    // For tilde: 1.7.8 => 1.7.0 and 0.5.9 => 0.5.0
    const pre = semver.prerelease(version);
    const major = semver.major(version);
    if (type === 'caret' && major >= 1) {
      version = `${major}.x.x`;
    } else {
      const minor = semver.minor(version);
      version = `${major}.${minor}.x`;
    }
    if (pre) {
      version += '-' + pre.join('.');
    }

    return version;
  }
}

export default ToolReference;
