import {printErrorAndExit} from '@resdir/console';

import {runExpression, runREPL} from '../';

(async () => {
  let expression = process.argv.slice(2);
  expression = expression.map(arg => '"' + arg + '"');
  expression = expression.join(' ');

  const directory = process.cwd();

  if (expression) {
    await runExpression(expression, {directory});
  } else {
    await runREPL({directory});
  }
})().catch(printErrorAndExit);
