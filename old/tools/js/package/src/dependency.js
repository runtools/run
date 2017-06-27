import {compactObject, throwUserError, formatString, formatCode} from 'run-common';
import VersionRange from 'run-cli/dist/version-range';

import {fetchNPMRegistry} from './common';

export class Dependency {
  constructor(dependency) {
    Object.assign(this, dependency);
  }

  static create(definition, {context} = {}) {
    if (definition === undefined) {
      throw new Error('\'definition\' argument is missing');
    }

    if (typeof definition === 'string') {
      definition = {package: definition};
    }

    if (typeof definition !== 'object') {
      throwUserError(`Dependency definition must be a string or an object`, {context});
    }

    let name = definition.name;
    let version = definition.version;
    if (definition.package) {
      ({name, version} = this.parsePackageProperty(definition.package));
    }

    if (!name) {
      throwUserError(`Dependency ${formatCode('name')} is missing`, {context});
    }

    if (version) {
      version = VersionRange.create(version, {context});
    }

    const manager = name.includes('/') && !name.startsWith('@') ? 'resdir' : 'npm';

    const dependency = new this({
      name,
      version,
      manager,
      type: definition.type || 'regular' // 'regular', 'peer', 'optional' or 'development'
    });

    return dependency;
  }

  toJSON() {
    let pkg = this.name;
    if (this.version) {
      pkg += '@' + this.version.toString();
    }
    let json = {
      package: pkg,
      type: this.type === 'regular' ? undefined : this.type
    };
    json = compactObject(json);
    if (Object.keys(json).length === 1) {
      // If there is only one property, it must be the package property and we can simplify the JSON
      json = json.package;
    }
    return json;
  }

  static createMany(definitions, {context}) {
    if (!definitions) {
      throw new Error('\'definitions\' argument is missing');
    }

    if (typeof definitions === 'string') {
      definitions = [definitions];
    }

    if (!Array.isArray(definitions)) {
      throwUserError(`${formatCode('dependencies')} property must be a string or an array`, {
        context
      });
    }

    return definitions.map(definition => this.create(definition, {context}));
  }

  static parsePackageProperty(pkg) {
    let name = pkg;
    let version;
    const index = name.indexOf('@', 1);
    if (index !== -1) {
      version = name.slice(index + 1);
      name = name.slice(0, index);
    }
    return {name, version};
  }

  async fetchLatestVersion({context}) {
    if (this.manager !== 'npm') {
      throw new Error(`${formatString(this.manager)} package manager is not yet implemented`);
    }

    const pkg = await fetchNPMRegistry(this.name, {context});
    const latestVersion = pkg['dist-tags'] && pkg['dist-tags'].latest;
    if (!latestVersion) {
      throwUserError(`Latest version not found for npm package ${formatString(this.name)}`, {
        context
      });
    }
    return latestVersion;
  }
}

export default Dependency;
