#!/usr/bin/env node

import 'regenerator-runtime/runtime';
import 'source-map-support/register';
import {join} from 'path';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import dotenv from 'dotenv';
import JSON5 from 'json5';
import {showErrorAndExit} from '@resdir/console';
import {Resource} from 'run-core';

import {run} from '../';

dotenv.config({path: join(__dirname, '..', '..', '.env')});

if (nodeVersion.major < 6) {
  showErrorAndExit('⚡run requires at least version 6 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

(async () => {
  let expression = process.argv.slice(2);
  expression = expression.map(arg => '"' + arg + '"');
  expression = expression.join(' ');

  const directory = process.cwd();
  let result = await run(expression, {directory});
  if (result instanceof Resource) {
    result = result.$autoUnbox();
  }
  if (result instanceof Resource) {
    result = result.$serialize();
  }
  if (result !== undefined) {
    console.log(JSON5.stringify(result, undefined, 2));
  }
})().catch(showErrorAndExit);
