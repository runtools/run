#!/usr/bin/env node

import 'source-map-support/register';
import {join} from 'path';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import dotenv from 'dotenv';
import {printErrorAndExit} from '@resdir/console';

import {runExpression, runREPL} from '../';

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

  const directory = process.cwd();

  if (expression) {
    await runExpression(expression, {directory});
  } else {
    await runREPL({directory});
  }
})().catch(printErrorAndExit);
