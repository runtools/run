#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import {
  showIntro, showCommandIntro, showOutro, getCommonOptions, getPathOption,
  getPackage, formatMessage, formatURL, showErrorAndExit
} from '@voila/common';
import { deploy } from '../lib/deployer';

(async function() {
  showIntro(require('../../package.json'));

  const { pkgDir, name, version, stage, config, awsConfig, verbose } = getCommonOptions();

  const pkg = getPackage(pkgDir);

  let entryFile = getPathOption('entry-file');
  if (!entryFile) {
    entryFile = config.entryFile || pkg.main || 'index.html';
    entryFile = resolve(pkgDir, entryFile);
  }

  const argv = minimist(process.argv.slice(2), {
    boolean: [
      'spa',
      'hash',
      'bundle',
      'transpile'
    ],
    default: {
      'spa': null,
      'hash': null,
      'bundle': null,
      'transpile': null
    }
  });

  let spa = argv['spa'];
  if (spa == null) spa = config.spa;
  if (spa == null) spa = true;

  let hash = argv['hash'];
  if (hash == null) hash = config.hash;
  if (hash == null) hash = true;

  let bundle = argv['bundle'];
  if (bundle == null) bundle = config.bundle;
  if (bundle == null) bundle = true;

  let transpile = argv['transpile'];
  if (transpile == null) transpile = config.transpile;
  if (transpile == null) transpile = true;

  showCommandIntro('Deploying', { name, stage });

  const { deploymentURL } = await deploy({
    entryFile, name, version, stage, awsConfig, spa, hash, bundle, transpile, verbose
  });

  console.log(formatMessage(
    `Deployment URL: ${formatURL(deploymentURL)}`, { status: 'deployed' }
  ));
  showOutro('Your website is deployed.');
})().catch(showErrorAndExit);
