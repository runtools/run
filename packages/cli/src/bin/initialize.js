#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { cyan } from 'chalk';
import { showIntro, showOutro, showCommandIntro, getPackage, createUserError, showErrorAndExit } from '@voila/common';
import { initialize } from '../lib/initializer';

const DEFAULT_STAGE = 'development';

(async function() {
  showIntro(require('../../package.json'));

  const argv = minimist(process.argv.slice(2), {
    string: [
      'type',
      'package-dir',
      'stage'
    ],
    boolean: [
      'yarn'
    ],
    default: {
      'yarn': null
    }
  });

  const type = argv.type || argv._[0];
  if (!type) {
    throw createUserError('\'type\' option is missing.', `Please specify the type of your package. Example: ${cyan('`voila init @voila/module`')}.`);
  }

  let pkgDir = argv['package-dir'];
  if (pkgDir) {
    pkgDir = resolve(process.cwd(), pkgDir);
  } else {
    pkgDir = process.cwd();
  }

  const stage = argv['stage'] || DEFAULT_STAGE;

  const yarn = argv['yarn'];

  showCommandIntro('Initializing', { name: getPackage(pkgDir).name, stage });

  await initialize({ pkgDir, stage, type, yarn });

  showOutro('Your package is initialized.');
})().catch(showErrorAndExit);
