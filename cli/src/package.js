import {existsSync} from 'fs';
import {join} from 'path';
import {readFileSync as readJSON, writeFileSync as writeJSON} from 'jsonfile';
import pick from 'lodash.pick';
import inquirer from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import Fuse from 'fuse.js';
import {gray} from 'chalk';

inquirer.registerPrompt('autocomplete', autocomplete);

import {createUserError, fetchJSON, adjustToWindowWidth} from '@high/shared';

import Tool from './tool';
import repository from './repository';

const NPMS_API_URL = 'https://api.npms.io/v2';

export class Package {
  constructor() {} // eslint-disable-line

  async initialize() {
    // opts
    const pkgDir = process.cwd();
    const pkgFile = join(pkgDir, 'package.json');
    let pkg;
    if (existsSync(pkgFile)) {
      pkg = readJSON(pkgFile);
    } else {
      pkg = {name: '', version: ''};
      writeJSON(pkgFile, pkg, {spaces: 2});
    }
  }

  async getTools() {
    if (!this._tools) {
      const pkg = await this.getPackageFileContent();
      const tools = Package.normalizeTools(pkg.tools);
      const mergedTools = [];
      for (const tool of tools) {
        const {name, version} = tool;
        const {packageDir, packageContent} = await repository.loadPackage({name, version});
        let loadedTool = packageContent.tool;
        if (!loadedTool) {
          throw createUserError(`${name}@${version} is not a tool`);
        }
        Object.assign(loadedTool, {name, version, packageDir});
        loadedTool = new Tool(Tool.normalize(loadedTool));
        loadedTool.merge(tool);
        mergedTools.push(loadedTool);
      }
      this._tools = mergedTools;
    }
    return this._tools;
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

  async getPackageFileContent() {
    if (!this._packageFileContent) {
      const pkgFile = join(this.getPackageDir(), 'package.json');
      this._packageFileContent = readJSON(pkgFile);
    }
    return this._packageFileContent;
  }

  getPackageDir() {
    if (!this._packageDir) {
      this._packageDir = Package.searchPackageDir(process.cwd());
    }
    return this._packageDir;
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
