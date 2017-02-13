'use strict';

import { join } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child-process-promise';
import { red, yellow } from 'chalk';
import { packageTypeToExecutableName, createUserError } from '@voila/common';

export async function run({ inputDir, type, args }) {
  const executable = join(
    inputDir, 'node_modules', '.bin', packageTypeToExecutableName(type)
  );
  if (!existsSync(executable)) {
    throw createUserError(`${red('Package handler not found!')} Are you sure that ${yellow(type)} is a Voila type?`);
  }
  await spawn(`${executable}`, args, { cwd: inputDir, stdio: 'inherit' });
}
