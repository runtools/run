import {existsSync} from 'fs';
import {join} from 'path';
import {readFileSync as readJSON, writeFileSync as writeJSON} from 'jsonfile';
import pick from 'lodash.pick';

import {createUserError, formatPath} from '@high/shared';

import Command from './command';
import Config from './config';
import ToolReference from './tool-reference';

export class PackageDefinition {
  constructor(pkgDef) {
    Object.assign(
      this,
      pick(pkgDef, [
        'name',
        'version',
        'description',
        'author',
        'private',
        'license',
        'repository',
        'commands',
        'config',
        'toolRefs'
      ])
    );
  }

  static async load(dir = process.cwd()) {
    dir = this.searchPackageDir(dir);
    let pkgDef = this.readPackageFile(dir);
    pkgDef = this.normalize(pkgDef);
    pkgDef.packageDir = dir;
    return pkgDef;
  }

  static async create(dir = process.cwd()) {
    let pkgDef = this.readPackageFile(dir, false);
    if (pkgDef) {
      pkgDef = this.normalize(pkgDef);
    } else {
      pkgDef = {name: '', version: ''};
      this.writePackageFile(dir, pkgDef);
      pkgDef = new this(pkgDef);
    }
    pkgDef.packageDir = dir;
    return pkgDef;
  }

  static normalize(pkgDef) {
    if (!pkgDef) {
      throw new Error("'pkgDef' parameter is missing");
    }
    if (!pkgDef.name) {
      throw new Error("Package 'name' property is missing");
    }
    if (!pkgDef.version) {
      throw new Error("Package 'version' property is missing");
    }
    let normalizedPkgDef = pick(pkgDef, [
      'name',
      'version',
      'description',
      'author',
      'private',
      'license'
    ]);
    normalizedPkgDef.repository = this.normalizeRepository(pkgDef.repository);
    normalizedPkgDef.commands = Command.normalizeMany(pkgDef.commands, pkgDef.defaultCommand);
    normalizedPkgDef.config = Config.normalize(pkgDef.config);
    normalizedPkgDef.toolRefs = ToolReference.normalizeMany(pkgDef.tools);
    normalizedPkgDef = new this(normalizedPkgDef);
    return normalizedPkgDef;
  }

  static readPackageFile(dir, errorIfNotFound = true) {
    try {
      const pkg = readJSON(join(dir, 'package.json'));
      return pkg;
    } catch (err) {
      if (errorIfNotFound) {
        throw createUserError(`${formatPath('package.json')} file not found in ${formatPath(dir)}`);
      }
      return undefined;
    }
  }

  static writePackageFile(dir, pkg) {
    writeJSON(join(dir, 'package.json'), pkg, {spaces: 2});
  }

  static searchPackageDir(dir) {
    if (existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parentDir = join(dir, '..');
    if (parentDir === dir) {
      throw createUserError('No package found in the current directory');
    }
    return this.searchPackageDir(parentDir);
  }

  static normalizeRepository(repository) {
    if (!repository) {
      return undefined;
    }

    // TODO: more normalizations
    // Also, we should not assume that the repository type is always Git

    return repository.url || repository;
  }
}

export default PackageDefinition;
