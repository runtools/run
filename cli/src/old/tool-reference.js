import entries from 'lodash.topairs';
import semver from 'semver';

import Hook from './hook';
import Config from './config';

export class ToolReference {
  constructor(normalizedToolRef) {
    Object.assign(this, normalizedToolRef);
  }

  static normalize(toolRef, defaultName) {
    if (!toolRef) {
      throw new Error("'toolRef' parameter is missing");
    }

    if (typeof toolRef === 'string') {
      toolRef = {version: toolRef};
    }

    if (!toolRef.name) {
      if (defaultName) {
        toolRef.name = defaultName;
      } else {
        throw new Error("ToolReference 'name' property is missing");
      }
    }

    const normalizedToolRef = {
      name: this.normalizeName(toolRef.name),
      version: this.normalizeVersion(toolRef.version),
      hooks: Hook.normalizeMany(toolRef.hooks),
      config: Config.normalize(toolRef.config)
    };

    return new this(normalizedToolRef);
  }

  static normalizeMany(toolRefs = []) {
    if (Array.isArray(toolRefs)) {
      return toolRefs.map(this.normalize, this);
    }
    return entries(toolRefs).map(([name, toolRef]) => this.normalize(toolRef, name));
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

    const exactVersion = semver.clean(version);
    if (exactVersion) {
      return exactVersion; // '0.3.2', '2.3.1-beta',...
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
