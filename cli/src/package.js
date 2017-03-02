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

import Tool from './tool';
import packageStore from './package-store';

const NPMS_API_URL = 'https://api.npms.io/v2';

export class Package {
  constructor(pkg) {
    Object.assign(this, pkg);
  }

  static async load(dir = process.cwd()) {
    dir = this.searchPackageDir(dir);
    let pkg = this.readPackageFileContent(dir);
    pkg = this.normalize(pkg);
    pkg = new this(pkg);
    pkg.packageDir = dir;
    return pkg;
  }

  static async create(dir = process.cwd()) {
    let pkg = this.readPackageFileContent(dir, false);
    if (pkg) {
      pkg = this.normalize(pkg);
    } else {
      pkg = {name: '', version: ''};
      this.writePackageFileContent(dir, pkg);
    }
    pkg = new this(pkg);
    pkg.packageDir = dir;
    return pkg;
  }

  static normalize(pkg) {
    if (!pkg) {
      throw new Error("'pkg' parameter is missing");
    }

    if (!pkg.name) {
      throw new Error("'name' property is missing in a package");
    }

    if (!pkg.version) {
      throw new Error("'version' property is missing in a package");
    }

    const normalizedPackage = pick(pkg, [
      'name',
      'version',
      'description',
      'author',
      'private',
      'license'
    ]);

    normalizedPackage.repository = Package.normalizeRepository(pkg.repository);
    normalizedPackage.tools = Package.normalizeTools(pkg.tools);

    return normalizedPackage;
  }

  static readPackageFileContent(dir, errorIfNotFound = true) {
    try {
      return readJSON(join(dir, 'package.json'));
    } catch (err) {
      if (errorIfNotFound) {
        throw createUserError(`${formatPath('package.json')} file not found in ${formatPath(dir)}`);
      }
      return undefined;
    }
  }

  static writePackageFileContent(dir, pkg) {
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
    return Package.searchPackageDir(parentDir);
  }

  async instantiateTools() {
    if (!this._instantiatedTools) {
      const instantiatedTools = [];
      for (const tool of this.tools) {
        const {name, version} = tool;
        const {packageDir, packageContent} = await packageStore.loadPackage({name, version});
        let loadedTool = packageContent.tool;
        if (!loadedTool) {
          throw createUserError(`${name}@${version} is not a tool`);
        }
        Object.assign(loadedTool, {name, version, packageDir});
        const instantiatedTool = new Tool(Tool.normalize(loadedTool));
        instantiatedTool.merge(tool);
        instantiatedTools.push(instantiatedTool);
      }
      this._instantiatedTools = instantiatedTools;
    }
    return this._instantiatedTools;
  }

  static normalizeTools(tools) {
    if (!tools) {
      return [];
    }

    if (!Array.isArray(tools)) {
      const normalizedTools = [];

      for (const name of Object.keys(tools)) {
        let tool = tools[name];
        if (typeof tool === 'string') {
          tool = {version: tool};
        }
        tool.name = name;
        tool = new Tool(Tool.normalize(tool));
        normalizedTools.push(tool);
      }

      return normalizedTools;
    }

    return tools.map(tool => new Tool(Tool.normalize(tool)));
  }

  static normalizeConfig(config) {
    if (!config) {
      return {};
    }

    return config; // TODO: more normalizations
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
    const types = await Package.fetchTypes();

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
