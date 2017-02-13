#!/usr/bin/env node

'use strict';

import { showErrorAndExit } from '@voila/common';
import { forward } from '../lib/forwarder';

(async function() {
  const pkgDir = process.cwd();
  const args = process.argv.slice(2);
  await forward({ pkgDir, args });
})().catch(showErrorAndExit);
