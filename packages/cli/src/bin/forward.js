#!/usr/bin/env node

'use strict';

import { getPackageDirOption, showErrorAndExit } from '@voila/common';
import { forward } from '../lib/forwarder';

(async function() {
  const pkgDir = getPackageDirOption();
  const args = process.argv.slice(2);
  const code = await forward({ pkgDir, args });
  if (code) process.exit(code);
})().catch(showErrorAndExit);
