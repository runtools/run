import {existsSync} from 'fs';
import {join} from 'path';
import {readFileSync as readJSON, writeFileSync as writeJSON} from 'jsonfile';
import pick from 'lodash.pick';
import inquirer from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import Fuse from 'fuse.js';
import {gray} from 'chalk';

inquirer.registerPrompt('autocomplete', autocomplete);

import {createUserError, formatPath, fetchJSON, adjustToWindowWidth} from '@high/shared';

import Executable from './executable';
import Tool from './tool';
import ToolDefinition from './tool-definition';
import ToolReference from './tool-reference';

const NPMS_API_URL = 'https://api.npms.io/v2';

export class Package extends Executable {
  constructor(pkg) {
    super();
    Object.assign(
      this,
      pick(pkg, [
        'name',
        'version',
        'description',
        'author',
        'private',
        'license',
        'repository',
        'tools'
      ])
    );
  }

  static async load(dir = process.cwd()) {
    dir = this.searchPackageDir(dir);
    let pkg = this.readPackageFile(dir);
    pkg = this.normalize(pkg);
    pkg.packageDir = dir;
    return pkg;
  }

  static async create(dir = process.cwd()) {
    let pkg = this.readPackageFile(dir, false);
    if (pkg) {
      pkg = this.normalize(pkg);
    } else {
      pkg = {name: '', version: ''};
      this.writePackageFile(dir, pkg);
      pkg = new this(pkg);
    }
    pkg.packageDir = dir;
    return pkg;
  }

  static normalize(pkg) {
    if (!pkg) {
      throw new Error("'pkg' parameter is missing");
    }
    if (!pkg.name) {
      throw new Error("Package 'name' property is missing");
    }
    if (!pkg.version) {
      throw new Error("Package 'version' property is missing");
    }
    let normalizedPackage = pick(pkg, [
      'name',
      'version',
      'description',
      'author',
      'private',
      'license'
    ]);
    normalizedPackage.repository = this.normalizeRepository(pkg.repository);
    normalizedPackage.tools = ToolReference.normalizeMany(pkg.tools);
    normalizedPackage = new this(normalizedPackage);
    return normalizedPackage;
  }

  static readPackageFile(dir, errorIfNotFound = true) {
    try {
      return readJSON(join(dir, 'package.json'));
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

  async instantiateTools() {
    if (!this._instantiatedTools) {
      const instantiatedTools = [];
      for (const toolRef of this.tools) {
        const {name, version} = toolRef;
        const toolDef = await ToolDefinition.loadFromStore({name, version});
        const instantiatedTool = new Tool(toolDef, toolRef);
        instantiatedTools.push(instantiatedTool);
      }
      this._instantiatedTools = instantiatedTools;
    }
    return this._instantiatedTools;
  }

  static normalizeRepository(repository) {
    if (!repository) {
      return undefined;
    }

    // TODO: more normalizations
    // Also, we should not assume that the repository type is always Git

    return repository.url || repository;
  }

  static async promptType() {
    const types = await this.fetchTypes();

    const fuse = new Fuse(types, {keys: ['name', 'description', 'keywords']});

    const answers = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'text',
        message: 'Package type:',
        async source(answersSoFar, input) {
          const choices = input ? fuse.search(input) : types;
          return choices.map(choice => {
            let text = choice.name;
            if (choice.description) {
              text += ' ' + gray(choice.description);
            }
            if (choice.description) {
              text += ' ' + gray(choice.description);
            }
            text = adjustToWindowWidth(text, {leftMargin: 3});
            return text;
          });
        }
      }
    ]);

    const answeredType = answers.text.split(' ')[0];
    const type = types.find(type => type.name === answeredType);
    return type;
  }

  static async fetchTypes() {
    const url = NPMS_API_URL + '/search?q=keywords:voila-package-handler&size=250';
    const json = await fetchJSON(url, {timeout: 15 * 1000, cacheTime: 60 * 1000});
    const types = json.results.map(result =>
      pick(result.package, ['name', 'description', 'version', 'keywords']));
    return types;
  }
}

export default Package;
