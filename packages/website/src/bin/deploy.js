#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { showIntro, showOutro, getPackage, showErrorAndExit, getAWSConfig } from '@voila/common';
import { cyan } from 'chalk';
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
      'bundle',
      'transpile'
    ],
    default: {
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

  let bundle = argv['bundle'];
  if (bundle == null) bundle = config.bundle;
  if (bundle == null) bundle = true;

  let transpile = argv['transpile'];
  if (transpile == null) transpile = config.transpile;
  if (transpile == null) transpile = true;

  const { deploymentURL } = await deploy({
    entryFile, name, version, stage, awsConfig, bundle, transpile
  });

  showOutro('Your website has been deployed.');
  console.log(`Deployment URL: ${cyan.underline(deploymentURL)}`);
})().catch(showErrorAndExit);
