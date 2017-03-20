#!/usr/bin/env node

import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from 'run-common';

import Expression from '../expression';
import {runMany} from '../runner';

if (nodeVersion.major < 4) {
  showErrorAndExit('⚡run requires at least version 4 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

async function cli(dir, args) {
  const expressions = Expression.createManyFromShell(args);
  await runMany(dir, expressions);
}

cli(process.cwd(), process.argv.slice(2)).catch(showErrorAndExit);
