#!/usr/bin/env node

'use strict';

import { resolve } from 'path';
import minimist from 'minimist';
import { showIntro, showOutro, showErrorAndExit } from '@voila/common';
import { initialize } from '../lib/initializer';

(async function() {
  showIntro(require('../../package.json'));

  const argv = minimist(process.argv.slice(2), {
    string: [
      'package-dir',
      'type'
    ],
    boolean: [
      'yarn'
    ],
    default: {
      'yarn': null
    }
  });

  let pkgDir = argv['package-dir'];
  if (pkgDir) {
    pkgDir = resolve(process.cwd(), pkgDir);
  } else {
    pkgDir = process.cwd();
  }

  const type = argv.type || argv._[0];

  const yarn = argv['yarn'];

  await initialize({ pkgDir, type, yarn });

  showOutro('Your package is ready.');
})().catch(showErrorAndExit);
