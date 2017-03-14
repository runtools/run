import {existsSync} from 'fs';
import {join} from 'path';
import {readFileSync as readJSON, writeFileSync as writeJSON} from 'jsonfile';
import pick from 'lodash.pick';
import inquirer from 'inquirer';
import autocomplete from 'inquirer-autocomplete-prompt';
import Fuse from 'fuse.js';
import {gray} from 'chalk';

import {showIntro, fetchJSON, adjustToWindowWidth} from 'run-common';

inquirer.registerPrompt('autocomplete', autocomplete);

const NPMS_API_URL = 'https://api.npms.io/v2';

export class Package {
  constructor(opts) {
    this.type = opts.type;
    this.yarn = opts.yarn;
  }

  async initialize() {
    const pkgDir = process.cwd();
    const pkgFile = join(pkgDir, 'package.json');
    let pkg;
    if (existsSync(pkgFile)) {
      pkg = readJSON(pkgFile);
    } else {
      pkg = {name: '', version: ''};
      writeJSON(pkgFile, pkg, {spaces: 2});
    }

    if (!pkg.voila) {
      pkg.voila = {};
    }

    if (!pkg.voila.type) {
      if (!this.type) {
        showIntro(require('../package.json'));
        const result = await Package.promptType();
        this.type = result.name + '@^' + result.version;
      }
      pkg.voila.type = this.type;
      writeJSON(pkgFile, pkg, {spaces: 2});
    }
  }

  async installOrUpdatePackage() {}

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
