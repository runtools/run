#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { showIntro, showCommandIntro, showOutro, getPackage, formatMessage, formatURL, showErrorAndExit, getAWSConfig } from '@voila/common';
import { deploy } from '../lib/deployer';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STAGE = 'development';

(async function() {
  showIntro(require('../../package.json'));

  const argv = minimist(process.argv.slice(2), {
    string: [
      'package-dir',
      'entry-file',
      'stage',
      'aws-access-key-id',
      'aws-secret-access-key',
      'aws-region'
    ],
    boolean: [
      'spa',
      'hash',
      'bundle',
      'transpile',
      'verbose'
    ],
    default: {
      'spa': null,
      'hash': null,
      'bundle': null,
      'transpile': null
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

  let entryFile = argv['entry-file'] || config.entryFile || pkg.main || 'index.html';
  entryFile = resolve(process.cwd(), entryFile);

  const stage = argv.stage || config.stage || DEFAULT_STAGE;

  const awsConfig = getAWSConfig({ region: DEFAULT_REGION }, process.env, config, argv);

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

  const verbose = argv['verbose'] || config.verbose;

  showCommandIntro('Deploying', { name, stage });

  const { deploymentURL } = await deploy({
    entryFile, name, version, stage, awsConfig, spa, hash, bundle, transpile, verbose
  });

  console.log(formatMessage(
    `Deployment URL: ${formatURL(deploymentURL)}`, { status: 'info' }
  ));
  showOutro('Your website has been deployed.');
})().catch(showErrorAndExit);
