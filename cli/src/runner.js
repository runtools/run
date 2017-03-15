import {join} from 'path';
import {formatCode, throwUserError} from 'run-common';

import Tool from './tool';

export async function run(dir, invocation) {
  const tool = await Tool.load(dir);
  if (tool && tool.canRun(invocation)) {
    return await tool.run(invocation);
  }

  const parentDir = join(dir, '..');
  if (parentDir !== dir) {
    return await run(parentDir, invocation);
  }

  const cmdName = invocation.getCommandName();

  if (!cmdName) {
    console.log('TODO: display general help');
    return;
  }

  throwUserError(`Command ${formatCode(cmdName)} not found`);
}
