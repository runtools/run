#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { showIntro, showOutro, showCommandIntro, getPackage, showErrorAndExit, getAWSConfig } from '@voila/common';
import { remove } from '../lib/remover';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STAGE = 'development';

(async function() {
  showIntro(require('../../package.json'));

  const argv = minimist(process.argv.slice(2), {
    string: [
      'package-dir',
      'stage',
      'aws-access-key-id',
      'aws-secret-access-key',
      'aws-region'
    ]
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

  const stage = argv.stage || config.stage || DEFAULT_STAGE;

  const awsConfig = getAWSConfig({ region: DEFAULT_REGION }, process.env, config, argv);

  showCommandIntro('Removing', { name, stage });

  await remove({ name, version, stage, awsConfig });

  showOutro('Your module has been removed.');
})().catch(showErrorAndExit);
