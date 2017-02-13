#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { getPackage, showErrorAndExit, getEnvironmentConfig, getAWSConfig } from '@voila/common';
import { green, yellow, gray, cyan } from 'chalk';
import { deploy } from '../lib/deployer';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STAGE = 'development';
const DEFAULT_MEMORY_SIZE = 128;
const DEFAULT_TIMEOUT = 3;

(async function() {
  const argv = minimist(process.argv.slice(2), {
    string: [
      'package-dir',
      'entry-file',
      'stage',
      'role',
      'environment',
      'aws-access-key-id',
      'aws-secret-access-key',
      'aws-region'
    ],
    number: [
      'memory-size',
      'timeout'
    ],
    boolean: [
      'bundle',
      'transpile',
      'usage-instructions'
    ],
    alias: {
      'environment': ['env']
    },
    default: {
      'bundle': null,
      'transpile': null,
      'usage-instructions': null
    }
  });

  let pkgDir = argv['package-dir'];
  if (pkgDir) {
    pkgDir = resolve(process.cwd(), pkgDir);
  } else {
    pkgDir = process.cwd();
  }

  const pkg = getPackage(pkgDir);

  const { name, version } = pkg;

  const config = pkg.voila || {};

  let entryFile = argv['entry-file'] || config.entryFile || pkg.module || pkg.main || 'index.js';
  entryFile = resolve(process.cwd(), entryFile);

  const stage = argv.stage || config.stage || DEFAULT_STAGE;

  const role = argv.role || config.role;

  const memorySize = argv['memory-size'] || config.memorySize || DEFAULT_MEMORY_SIZE;

  const timeout = argv['timeout'] || config.timeout || DEFAULT_TIMEOUT;

  const environment = getEnvironmentConfig(config.environment, argv.environment);

  const awsConfig = getAWSConfig({ region: DEFAULT_REGION }, process.env, config, argv);

  let bundle = argv['bundle'];
  if (bundle == null) bundle = config.bundle;
  if (bundle == null) bundle = true;

  let transpile = argv['transpile'];
  if (transpile == null) transpile = config.transpile;
  if (transpile == null) transpile = true;

  let usageInstructions = argv['usage-instructions'];
  if (usageInstructions == null) usageInstructions = config.usageInstructions;
  if (usageInstructions == null) usageInstructions = true;

  const voilaModulePkg = require('../../package.json');
  console.log(`\n${green(voilaModulePkg.displayName)} ${gray(`v${voilaModulePkg.version}`)}\n`);

  const { apiURL } = await deploy({ entryFile, name, version, stage, role, memorySize, timeout, environment, awsConfig, bundle, transpile });

  console.log(`\nVoilà! Your module is deployed here:\n\n  ${yellow(apiURL)}\n`);

  if (usageInstructions) {
    console.log(`To use it, install and import @voila/module-client:

  ${cyan('import ModuleClient from \'@voila/module-client\';')}

Import your module with:

  ${cyan(`const awesomeModule = await ModuleClient.import('${apiURL}');`)}

Then invoking a function remotely is as simple as:

  ${cyan('const result = await awesomeModule.crazyFunction(\'foo\', \'bar\');')}\n`);
  }
})().catch(showErrorAndExit);
