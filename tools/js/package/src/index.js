import {join, dirname} from 'path';
import {remove, sortBy, lowerCase, isEmpty} from 'lodash';
import {writeFile, formatString, throwUserError} from 'run-common';
import Tool from 'run-cli/dist/tool';
import VersionRange from 'run-cli/dist/version-range';

import {execYarn} from './common';
import Dependency from './dependency';

export class JSPackage extends Tool {
  static async load(file, {context} = {}) {
    const pkg = await Tool.load.call(this, file, {context});
    context = this.extendContext(context, pkg);
    pkg.dependencies = Dependency.createMany(pkg.dependencies || [], {context});
    return pkg;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      dependencies: this.dependencies.length ? this.dependencies : undefined,
      npmName: this.npmName
    };
  }

  static extendContext(base, pkg) {
    return {...base, jsPackage: pkg.getResourceFile()};
  }

  async addDependency(definition, {context}) {
    const dependency = Dependency.create(definition, {context});

    if (!dependency.version) {
      const latestVersion = await dependency.fetchLatestVersion({context});
      dependency.version = VersionRange.create('^' + latestVersion, {context});
    }

    remove(this.dependencies, dep => dep.name === dependency.name);
    this.dependencies.push(dependency);
    this.sortDependencies();
    return dependency;
  }

  async removeDependency(name, {context}) {
    const removed = remove(this.dependencies, dep => dep.name === name);
    if (!removed.length) {
      throwUserError('Dependency not found:', {info: formatString(name), context});
    }
    return removed[0];
  }

  sortDependencies() {
    this.dependencies = sortBy(this.dependencies, dependency => lowerCase(dependency.name));
  }

  async updateDependencies({debug, context}) {
    await this.writePackageFile({context});
    await execYarn(['install'], {debug, context});
  }

  async writePackageFile({_context}) {
    const getDependencies = type => {
      const dependencies = {};
      for (const dependency of this.dependencies) {
        if (dependency.manager === 'npm' && dependency.type === type) {
          dependencies[dependency.name] = dependency.version || '*';
        }
      }
      if (!isEmpty(dependencies)) {
        return dependencies;
      }
    };

    const pkg = {
      name: this.npmName,
      version: this.version,
      description: this.description,
      author: this.authors.length === 1 ? this.authors[0] : undefined,
      contributors: this.authors.length > 1 ? this.authors : undefined,
      license: this.license || 'UNLICENSED',
      repository: this.repository,
      dependencies: getDependencies('regular'),
      peerDependencies: getDependencies('peer'),
      optionalDependencies: getDependencies('optional'),
      devDependencies: getDependencies('development')
    };

    const dir = dirname(this.getResourceFile());
    const file = join(dir, 'package.json');
    writeFile(file, pkg, {stringify: true});
  }
}

export default JSPackage;
