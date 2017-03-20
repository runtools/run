import {join, resolve} from 'path';
import {formatCode, throwUserError} from 'run-common';

import Tool from './tool';

async function run(dir, expression, globalConfig) {
  const cmdName = expression.getCommandName();

  if (cmdName === 'initialize' || cmdName === 'init') {
    const tool = await Tool.ensure(dir, expression.config);
    console.dir(tool, {depth: 10});
    return;
  }

  const tool = await Tool.load(dir);
  if (tool && tool.canRun(expression)) {
    return await tool.run(expression, globalConfig);
  }

  const parentDir = join(dir, '..');
  if (parentDir !== dir) {
    return await run(parentDir, expression);
  }

  if (!cmdName) {
    console.log('TODO: display general help');
    return;
  }

  throwUserError(`Command ${formatCode(cmdName)} not found`);
}

export async function runMany(dir, expressions) {
  if (!expressions) {
    throw new Error("'expressions' argument is missing");
  }

  const globalConfig = await Tool.loadGlobalConfig(dir);

  let result;
  for (const expression of expressions) {
    let config = globalConfig;

    if ('config' in expression.config) {
      const file = resolve(dir, expression.config.config);
      config = await Tool.loadConfig(file, globalConfig);
    }

    result = await run(dir, expression, config);
  }
  return result;
}
