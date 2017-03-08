#!/usr/bin/env node

import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from '@high/shared';

import Invocation from '../invocation';
import * as commands from './commands';

if (nodeVersion.major < 4) {
  showErrorAndExit('⚡high requires at least version 4 of Node.');
}

const pkg = require('../../package');
updateNotifier({pkg}).notify();

const aliases = new Map();
for (const key of Object.keys(commands)) {
  const command = commands[key];
  if (command.aliases) {
    for (const alias of command.aliases) {
      aliases.set(alias, key);
    }
  }
}

const invocation = Invocation.create(process.argv.slice(2), process.cwd());

if (invocation.name) {
  const actualName = aliases.get(invocation.name);
  if (actualName) {
    invocation.name = actualName;
  }
  if (!(invocation.name in commands)) {
    invocation.arguments.unshift(invocation.name);
    invocation.name = undefined;
  }
}

if (!invocation.name) {
  invocation.name = 'default';
}

const commandFn = commands[invocation.name];

commandFn(invocation).catch(showErrorAndExit);
