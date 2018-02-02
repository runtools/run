#!/usr/bin/env node

import 'source-map-support/register';
import {join} from 'path';
import nodeVersion from 'node-version';
import updateNotifier from 'update-notifier';
import dotenv from 'dotenv';
import {printErrorAndExit} from '@resdir/console';

dotenv.config({path: join(__dirname, '..', '..', '..', '.env')});

if (nodeVersion.major < 6) {
  printErrorAndExit('⚡run requires at least version 6 of Node.');
}

const pkg = require('../../../package.json');
updateNotifier({pkg}).notify();

require('./main');
