#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { showErrorAndExit } from '@voila/common';
import { initialize } from '../lib/initializer';

(async function() {
  const argv = minimist(process.argv.slice(2), {
    string: ['package-dir']
  });

  let pkgDir = argv['package-dir'];
  if (pkgDir) {
    pkgDir = resolve(process.cwd(), pkgDir);
  } else {
    pkgDir = process.cwd();
  }

  await initialize({ pkgDir });
})().catch(showErrorAndExit);
