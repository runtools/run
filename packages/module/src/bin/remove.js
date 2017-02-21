#!/usr/bin/env node

'use strict';

import {
  showIntro, showOutro, showCommandIntro, getCommonOptions,
  autoUpdatePackageHandler, showErrorAndExit
} from '@voila/common';
import { remove } from '../lib/remover';

(async function() {
  showIntro(require('../../package.json'));

  const { pkgDir, name, version, stage, awsConfig, autoUpdate } = getCommonOptions();

  if (autoUpdate) await autoUpdatePackageHandler({ pkgDir });

  showCommandIntro('Removing', { name, stage });

  await remove({ name, version, stage, awsConfig });

  showOutro('Your module has been removed.');
})().catch(showErrorAndExit);
