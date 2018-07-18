import {Resource} from 'run-core';
import {session, print, printError, formatDim} from '@resdir/console';

export async function runExpression(expression = '', {directory} = {}) {
  const resource = await Resource.$create(undefined, {directory});

  const method = await Resource.$create(
    {'@type': 'method', '@run': expression, '@output': {'@isOpen': true}},
    {directory}
  );

  return await session(async () => {
    return await method.$call(resource);
  });
}

export function runREPL({directory} = {}) {
  return new Promise(resolve => {
    const readline = require('readline');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: formatDim('> ')
    });

    rl.prompt();

    rl.on('line', line => {
      runLine(line, {directory}).then(() => rl.prompt());
    });

    rl.on('close', () => {
      print('');
      resolve();
    });
  });
}

async function runLine(line, {directory}) {
  line = line.trim();
  if (!line) {
    return;
  }
  try {
    const output = await runExpression(line, {directory});
    output.$print();
  } catch (err) {
    printError(err);
  }
}
