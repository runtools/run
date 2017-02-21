#!/usr/bin/env node

'use strict';

import { getPackageDirOption, showErrorAndExit } from '@voila/common';
import { initialize } from '../lib/initializer';

(async function() {
  const pkgDir = getPackageDirOption(false);
  await initialize({ pkgDir });
})().catch(showErrorAndExit);
