import {join} from 'path';
import {formatCode, createUserError} from 'run-common';

import Tool from './tool';

export async function run(dir, invocation) {
  const tool = await Tool.load(dir);
  if (tool) {
    try {
      return await tool.run(invocation);
    } catch (err) {
      if (err.code !== 'COMMAND_NOT_FOUND') {
        throw err;
      }
    }
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

  throw createUserError(`Command ${formatCode(cmdName)} not found`);
}
