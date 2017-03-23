import {join} from 'path';
import {existsSync} from 'fs';
import {execFile, spawn} from 'child-process-promise';
import {readFile, writeFile, formatCode, formatPath, throwUserError} from 'run-common';

export async function ensurePackageFile() {
  const file = join(process.cwd(), 'package.json');
  if (!existsSync(file)) {
    const pkg = {private: true};
    writeFile(file, pkg, {stringify: true});
    return;
  }

  const pkg = readFile(file, {parse: true});

  let changed = false;

  if (!pkg.private && !pkg.license) {
    pkg.license = 'UNLICENSED';
    changed = true;
  }

  if (changed) {
    writeFile(file, pkg, {stringify: true});
  }
}

export async function exec(command, args, {commandName, debug} = {}) {
  try {
    if (debug) {
      await spawn(command, args, {stdio: 'inherit'});
    } else {
      await execFile(command, args);
    }
  } catch (err) {
    throwUserError(
      `An error occured while executing ${commandName ? formatCode(commandName) : formatPath(command)}`,
      {
        hidden: !debug,
        capturedStandardError: err.stderr
      }
    );
  }
}

export async function execYarn(args, options) {
  const command = require.resolve('yarn/bin/yarn.js');
  args = [...args, '--no-progress', '--no-emoji', '--non-interactive'];
  await exec(command, args, {commandName: 'yarn', ...options});
}
