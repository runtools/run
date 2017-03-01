#!/usr/bin/env node

import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import {showErrorAndExit} from '@high/shared';

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

const args = process.argv.slice(2);

let command = args[0];

if (command) {
  const actualCommand = aliases.get(command);
  if (actualCommand) {
    command = actualCommand;
  }
  if (!(command in commands)) {
    command = undefined;
  }
}

if (command) {
  args.shift();
} else {
  command = 'default';
}

const commandFn = commands[command];

commandFn(args).catch(showErrorAndExit);
