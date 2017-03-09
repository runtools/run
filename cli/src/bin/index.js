#!/usr/bin/env node

import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from '@high/shared';

import Tool from '../tool';
import Invocation from '../invocation';

if (nodeVersion.major < 4) {
  showErrorAndExit('⚡high requires at least version 4 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

async function cli(dir, args) {
  const invocation = Invocation.create(dir, args);
  if (invocation.name === 'initialize' || invocation.name === 'init') {
    const tool = await Tool.ensure(dir, invocation.config);
    console.dir(tool, {depth: 10});
  } else {
    const tool = await Tool.load(dir);
    // console.dir(tool, {depth: 10});
    await tool.run(invocation);
  }
}

cli(process.cwd(), process.argv.slice(2)).catch(showErrorAndExit);
