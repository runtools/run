#!/usr/bin/env node

'use strict';

import minimist from 'minimist';
import {
  showIntro, showOutro, getPackageDirOption, showErrorAndExit
} from '@voila/common';
import { initialize } from '../lib/initializer';

(async function() {
  showIntro(require('../../package.json'));

  const pkgDir = getPackageDirOption(false);

  const argv = minimist(process.argv.slice(2), {
    string: [
      'type'
    ],
    boolean: [
      'yarn'
    ],
    default: {
      'yarn': null
    }
  });

  const type = argv.type || argv._[0];

  const yarn = argv['yarn'];

  const code = await initialize({ pkgDir, type, yarn });
  if (code) process.exit(code);

  showOutro('Your package is ready.');
})().catch(showErrorAndExit);
