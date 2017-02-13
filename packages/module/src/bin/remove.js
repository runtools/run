#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { getPackage, showErrorAndExit, getAWSConfig } from '@voila/common';
import { green, gray } from 'chalk';
import { remove } from '../lib/remover';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STAGE = 'development';

(async function() {
  const argv = minimist(process.argv.slice(2), {
    string: [
      'package-dir',
      'stage',
      'aws-access-key-id',
      'aws-secret-access-key',
      'aws-region'
    ]
  });

  let inputDir = argv['package-dir'] || argv._[0];
  if (inputDir) {
    inputDir = resolve(process.cwd(), inputDir);
  } else {
    inputDir = process.cwd();
  }

  const pkg = getPackage(inputDir);

  const { name, version } = pkg;

  const config = pkg.voila || {};

  const stage = argv.stage || config.stage || DEFAULT_STAGE;

  const awsConfig = getAWSConfig({ region: DEFAULT_REGION }, process.env, config, argv);

  const voilaModulePkg = require('../../package.json');
  console.log(`\n${green(voilaModulePkg.displayName)} ${gray(`v${voilaModulePkg.version}`)}\n`);

  await remove({ name, version, stage, awsConfig });

  console.log('\nVoilà! Your module has been removed.\n');
})().catch(showErrorAndExit);
