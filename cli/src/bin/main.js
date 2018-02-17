import {print, printErrorAndExit, formatCode, formatPunctuation} from '@resdir/console';

import {runExpression, runREPL} from '../';

(async () => {
  let expression = process.argv.slice(2);

  let printOutput;
  let index = expression.indexOf('--@print');
  if (index === -1) {
    index = expression.indexOf('--@p');
  }
  if (index !== -1) {
    printOutput = true;
    expression.splice(index, 1);
  }

  expression = expression.map(arg => arg.replace(/\s/g, '\\ '));
  expression = expression.join(' ');

  const directory = process.cwd();

  if (expression.includes('@version')) {
    // TODO: move this in run-core
    const pkg = require('../../../package.json');
    print(`${formatCode(pkg.name, {addBackticks: false})}${formatPunctuation(':')} ${pkg.version}`);
  }

  if (expression.includes('@repl')) {
    // TODO: move this in resource/helper
    await runREPL({directory});
    return;
  }

  const output = await runExpression(expression, {directory});
  if (printOutput) {
    output.$print();
  } else if (output && !output.$getIsMethodOutput()) {
    await output['@help']();
  }
})().catch(printErrorAndExit);
