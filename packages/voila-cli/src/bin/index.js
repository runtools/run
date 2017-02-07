#!/usr/bin/env node

'use strict';

import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import { showErrorAndExit } from 'voila-common';
const pkg = require('../../package');

if (nodeVersion.major < 4) {
  showErrorAndExit('Voila requires at least version 4 of Node.');
}

updateNotifier({ pkg }).notify();
