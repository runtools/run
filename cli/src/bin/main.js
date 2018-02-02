import {print, printErrorAndExit, formatCode, formatPunctuation} from '@resdir/console';

import {runExpression, runREPL} from '../';

(async () => {
  let expression = process.argv.slice(2);

  if (expression.includes('@version')) {
    // TODO: move this in run-core
    const pkg = require('../../../package.json');
    print(`${formatCode(pkg.name, {addBackticks: false})}${formatPunctuation(':')} ${pkg.version}`);
  }

  expression = expression.map(arg => '"' + arg + '"');
  expression = expression.join(' ');

  const directory = process.cwd();

  if (expression) {
    await runExpression(expression, {directory});
  } else {
    await runREPL({directory});
  }
})().catch(printErrorAndExit);
