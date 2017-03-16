import {join} from 'path';
import {formatCode, throwUserError} from 'run-common';

import Tool from './tool';

async function run(dir, expression) {
  const tool = await Tool.load(dir);
  if (tool && tool.canRun(expression)) {
    return await tool.run(expression);
  }

  const parentDir = join(dir, '..');
  if (parentDir !== dir) {
    return await run(parentDir, expression);
  }

  const cmdName = expression.getCommandName();

  if (!cmdName) {
    console.log('TODO: display general help');
    return;
  }

  throwUserError(`Command ${formatCode(cmdName)} not found`);
}

export async function runMany(dir, expressions) {
  if (!expressions) {
    throw new Error("'expressions' parameter is missing");
  }

  let result;
  for (const expression of expressions) {
    result = await run(dir, expression);
  }
  return result;
}
