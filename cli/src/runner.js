import {join} from 'path';
import {formatCode, throwUserError} from 'run-common';

import Tool from './tool';

export async function run(dir, expression) {
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
