#!/usr/bin/env node

import 'source-map-support/register';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from 'run-common';

import Expression from '../expression';
import Runner from '../runner';

if (nodeVersion.major < 6) {
  showErrorAndExit('⚡run requires at least version 6 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

async function cli(dir: string, args) {
  // if (cmdName === 'initialize' || cmdName === 'init') {
  //   const tool = await Tool.ensure(dir, expression.config);
  //   console.dir(tool, {depth: 10});
  //   return;
  // }

  const runner = await Runner.create(dir);
  const expressions = Expression.createManyFromShell(args, {dir});
  await runner.runMany(expressions);
}

cli(process.cwd(), process.argv.slice(2)).catch(showErrorAndExit);
