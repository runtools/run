#!/usr/bin/env node

import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from 'run-common';

import Tool from '../tool';
import Invocation from '../invocation';
import {run} from '../runner';

if (nodeVersion.major < 4) {
  showErrorAndExit('⚡run requires at least version 4 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

async function cli(dir, args) {
  const invocation = Invocation.create(args);
  const cmdName = invocation.getCommandName();
  if (cmdName === 'initialize' || cmdName === 'init') {
    const tool = await Tool.ensure(dir, invocation.config);
    console.dir(tool, {depth: 10});
  } else {
    await run(dir, invocation);
  }
}

cli(process.cwd(), process.argv.slice(2)).catch(showErrorAndExit);
