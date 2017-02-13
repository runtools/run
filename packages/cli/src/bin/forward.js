#!/usr/bin/env node

'use strict';

import { showErrorAndExit } from '@voila/common';
import { forward } from '../lib/forwarder';

(async function() {
  const inputDir = process.cwd();
  const args = process.argv.slice(2);
  await forward({ inputDir, args });
})().catch(showErrorAndExit);
