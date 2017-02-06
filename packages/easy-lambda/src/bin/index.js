#!/usr/bin/env node

'use strict';

import { join } from 'path';
import nodeVersion from 'node-version';
import { showErrorAndExit } from 'remotify-common';

// The following code is largely stolen from Now CLI
// https://github.com/zeit/now-cli

if (nodeVersion.major < 4) {
  showErrorAndExit('easy-lambda requires at least version 4 of Node.');
}

const defaultCommand = 'deploy';

const commands = new Set([
  defaultCommand,
  'help'
]);

const aliases = new Map([
]);

let cmd = defaultCommand;
const args = process.argv.slice(2);
const index = args.findIndex(arg => commands.has(arg));

if (index > -1) {
  cmd = args[index];
  args.splice(index, 1);

  if (cmd === 'help') {
    if (index < args.length && commands.has(args[index])) {
      cmd = args[index];
      args.splice(index, 1);
    } else {
      cmd = defaultCommand;
    }
    args.unshift('--help');
  }

  cmd = aliases.get(cmd) || cmd;
}

const bin = join(__dirname, cmd);
process.argv = process.argv.slice(0, 2).concat(args);
require(bin);
