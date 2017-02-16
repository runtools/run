'use strict';

import { join } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child-process-promise';
import { yellow } from 'chalk';
import { packageTypeToExecutableName, createUserError } from '@voila/common';

export async function run({ pkgDir, type, args }) {
  const executable = join(
    pkgDir, 'node_modules', '.bin', packageTypeToExecutableName(type)
  );
  if (!existsSync(executable)) {
    throw createUserError('Package handler not found!', `Are you sure that ${yellow(type)} is a Voilà type?`);
  }
  await spawn(`${executable}`, args, { cwd: pkgDir, stdio: 'inherit' });
}
