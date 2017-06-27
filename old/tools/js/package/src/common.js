import {execFile, spawn} from 'child-process-promise';
import {fetchJSON, formatCode, formatPath, throwUserError} from 'run-common';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

export async function exec(command, args, {commandName, debug, context} = {}) {
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
        capturedStandardError: err.stderr,
        context
      }
    );
  }
}

export async function execYarn(args, options) {
  const command = require.resolve('yarn/bin/yarn.js');
  args = [...args, '--no-progress', '--no-emoji', '--non-interactive'];
  await exec(command, args, {commandName: 'yarn', ...options});
}

export async function fetchNPMRegistry(name) {
  const url = NPM_REGISTRY_URL + '/' + name.replace('/', '%2F');
  return await fetchJSON(url, {
    headers: {Accept: 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*'},
    timeout: 15 * 1000,
    cacheTime: 60 * 1000
  });
}
