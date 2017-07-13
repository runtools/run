#!/usr/bin/env node

import 'source-map-support/register';
import {join} from 'path';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import dotenv from 'dotenv';
import {showErrorAndExit} from 'run-common';

import {run} from '../';

dotenv.config({path: join(__dirname, '..', '..', '.env')});

if (nodeVersion.major < 6) {
  showErrorAndExit('⚡run requires at least version 6 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

(async () => {
  const expression = process.argv.slice(2).join(' ');
  const directory = process.cwd();
  await run(expression, {directory});
})().catch(showErrorAndExit);
