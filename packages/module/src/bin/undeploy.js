#!/usr/bin/env node

'use strict';

import { join, resolve } from 'path';
import minimist from 'minimist';
import { showErrorAndExit, getAWSConfig } from '@voila/common';
import { green, gray } from 'chalk';
import { undeploy } from '../lib/undeployer';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STAGE = 'development';

const argv = minimist(process.argv.slice(2), {
  string: [
    'input-dir',
    'stage',
    'aws-access-key-id',
    'aws-secret-access-key',
    'aws-region'
  ]
});

let inputDir = argv['input-dir'] || argv._[0];
if (!inputDir) {
  showErrorAndExit('\'input-dir\' parameter is missing');
}
inputDir = resolve(process.cwd(), inputDir);

const pkg = require(join(inputDir, 'package.json'));

const { name, version } = pkg;

const config = pkg.voila || {};

const stage = argv.stage || config.stage || DEFAULT_STAGE;

const awsConfig = getAWSConfig({ region: DEFAULT_REGION }, process.env, config, argv);

(async function() {
  const voilaModulePkg = require('../../package.json');
  console.log(`\n${green(voilaModulePkg.displayName)} ${gray(`v${voilaModulePkg.version}`)}\n`);

  await undeploy({ name, version, stage, awsConfig });

  console.log('\nVoilà! Your module has been undeployed.\n');
})().catch(showErrorAndExit);
