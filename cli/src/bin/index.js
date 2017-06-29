#!/usr/bin/env node

import 'source-map-support/register';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from 'run-common';

import {run} from '../';

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
