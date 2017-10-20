#!/usr/bin/env node

import 'regenerator-runtime/runtime';
import 'source-map-support/register';
import {join} from 'path';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import dotenv from 'dotenv';
import {printErrorAndExit} from '@resdir/console';

import {run} from '../';

dotenv.config({path: join(__dirname, '..', '..', '.env')});

if (nodeVersion.major < 6) {
  printErrorAndExit('⚡run requires at least version 6 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

(async () => {
  let expression = process.argv.slice(2);
  expression = expression.map(arg => '"' + arg + '"');
  expression = expression.join(' ');

  if (expression === '') {
    throw new Error('REPL is not yet implemented');
  }

  const directory = process.cwd();
  const result = await run(expression, {directory});
  if (result) {
    result.$print();
  }
})().catch(printErrorAndExit);
