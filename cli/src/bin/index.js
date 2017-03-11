#!/usr/bin/env node

import flattenDeep from 'lodash.flattendeep';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from 'run-shared';

import Tool from '../tool';
import Invocation from '../invocation';

if (nodeVersion.major < 4) {
  showErrorAndExit('⚡run requires at least version 4 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

async function cli(dir, args) {
  const invocation = Invocation.create(args, process.cwd());
  if (invocation.name === 'initialize' || invocation.name === 'init') {
    const tool = await Tool.ensure(dir, invocation.config);
    console.dir(tool, {depth: 10});
  } else {
    let invocations = await Tool.resolveInvocation(invocation);
    invocations = flattenDeep(invocations);
    for (const invocation of invocations) {
      await invocation.runtime.run({
        dir: invocation.dir,
        arguments: invocation.arguments,
        config: invocation.config
      });
    }
  }
}

cli(process.cwd(), process.argv.slice(2)).catch(showErrorAndExit);
