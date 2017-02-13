#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { green, gray } from 'chalk';
import { showErrorAndExit } from '@voila/common';
import { initialize } from '../lib/initializer';

const DEFAULT_STAGE = 'development';

const argv = minimist(process.argv.slice(2), {
  string: [
    'input-dir',
    'stage',
    'type'
  ],
  boolean: [
    'yarn'
  ],
  default: {
    'yarn': null
  }
});

let inputDir = argv['input-dir'] || argv._[0];
if (inputDir) {
  inputDir = resolve(process.cwd(), inputDir);
} else {
  inputDir = process.cwd();
}

const stage = argv['stage'] || DEFAULT_STAGE;

const type = argv['type'];

const yarn = argv['yarn'];

(async function() {
  const voilaCLIPkg = require('../../package.json');
  console.log(`\n${green(voilaCLIPkg.displayName)} ${gray(`v${voilaCLIPkg.version}`)}\n`);

  await initialize({ inputDir, stage, type, yarn });

  console.log('\nVoilà! Your package is initialized.\n');
})().catch(showErrorAndExit);
