#!/usr/bin/env node

'use strict';

import { showIntro, showOutro, formatPath, showErrorAndExit } from '@voila/common';
import { cyan, gray } from 'chalk';

(async function() {
  showIntro(require('../../package.json'));

  console.log();

  console.log(`Once you have deployed your module, you can use it from the client side\nwith ${formatPath('@voila/module-client')}:

  ${cyan('import ModuleClient from \'@voila/module-client\';')}

Import your module with:

  ${cyan(`const awesomeModule = await ModuleClient.import('${gray.underline('<deployment-url>')}');`)}

Then invoking a function remotely is as simple as:

  ${cyan('const result = await awesomeModule.crazyFunction(\'foo\', \'bar\');')}`);

  console.log();
  showOutro('Happy coding! :)');
})().catch(showErrorAndExit);
