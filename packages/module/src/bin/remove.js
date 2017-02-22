#!/usr/bin/env node

'use strict';

import {
  showIntro, showOutro, showCommandIntro, getCommonOptions, showErrorAndExit
} from '@voila/common';
import { remove } from '../lib/remover';

(async function() {
  showIntro(require('../../package.json'));

  const { name, version, stage, awsConfig } = getCommonOptions();

  showCommandIntro('Removing', { name, stage });

  await remove({ name, version, stage, awsConfig });

  showOutro('Your module has been removed.');
})().catch(showErrorAndExit);
