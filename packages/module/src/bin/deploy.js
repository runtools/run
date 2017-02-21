#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import {
  getCommonOptions, getPathOption, showIntro, showOutro, showCommandIntro,
  autoUpdatePackageHandler, getPackage, formatMessage, formatURL,
  showErrorAndExit, getEnvironmentConfig
} from '@voila/common';
import { deploy } from '../lib/deployer';

const DEFAULT_MEMORY_SIZE = 128;
const DEFAULT_TIMEOUT = 3;

(async function() {
  showIntro(require('../../package.json'));

  const { pkgDir, name, version, stage, config, awsConfig, autoUpdate } = getCommonOptions();

  const pkg = getPackage(pkgDir);

  let entryFile = getPathOption('entry-file');
  if (!entryFile) {
    entryFile = config.entryFile || pkg.module || pkg.main || 'index.js';
    entryFile = resolve(pkgDir, entryFile);
  }

  const argv = minimist(process.argv.slice(2), {
    string: [
      'role',
      'environment'
    ],
    number: [
      'memory-size',
      'timeout'
    ],
    boolean: [
      'bundle',
      'transpile'
    ],
    alias: {
      'environment': ['env']
    },
    default: {
      'bundle': null,
      'transpile': null
    }
  });

  const role = argv.role || config.role;

  const memorySize = argv['memory-size'] || config.memorySize || DEFAULT_MEMORY_SIZE;

  const timeout = argv['timeout'] || config.timeout || DEFAULT_TIMEOUT;

  const environment = getEnvironmentConfig(config.environment, argv.environment);

  let bundle = argv['bundle'];
  if (bundle == null) bundle = config.bundle;
  if (bundle == null) bundle = true;

  let transpile = argv['transpile'];
  if (transpile == null) transpile = config.transpile;
  if (transpile == null) transpile = true;

  if (autoUpdate) await autoUpdatePackageHandler({ pkgDir });

  showCommandIntro('Deploying', { name, stage });

  const { deploymentURL } = await deploy({ entryFile, name, version, stage, role, memorySize, timeout, environment, awsConfig, bundle, transpile });

  console.log(formatMessage(
    `Deployment URL: ${formatURL(deploymentURL)}`, { status: 'deployed' }
  ));
  showOutro('Your module is deployed.', 'Find out how to use it with `voila usage`.');
})().catch(showErrorAndExit);
