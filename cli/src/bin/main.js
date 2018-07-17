import {
  print,
  printErrorAndExit,
  formatBold,
  formatDim,
  formatCode,
  formatDanger
} from '@resdir/console';
import {get} from '@resdir/http-client';
import LocalCache from '@resdir/local-cache';
import {compareVersions} from '@resdir/version';

import {runExpression, runREPL} from '../';

const INSTALL_WEBSITE_URL = 'https://install.run.tools';
const INSTALL_COMMAND = `curl ${INSTALL_WEBSITE_URL} | bash`;
const LATEST_VERSION_CACHE_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days

async function start() {
  let expression = process.argv.slice(2);

  let index;

  let stage;
  index = expression.findIndex(item => item.startsWith('--@stage='));
  if (index !== -1) {
    stage = expression[index].slice('--@stage='.length);
    expression.splice(index, 1);
  }
  for (const shortcut of ['--@dev', '--@test', '--@prod', '--@alpha', '--@beta']) {
    index = expression.indexOf(shortcut);
    if (index !== -1) {
      stage = shortcut.slice(3);
      expression.splice(index, 1);
    }
  }

  let printOutput;
  index = expression.indexOf('--@print');
  if (index === -1) {
    index = expression.indexOf('--@p');
  }
  if (index !== -1) {
    printOutput = true;
    expression.splice(index, 1);
  }

  expression = expression.map(arg => arg.replace(/\s/g, '\\ '));
  expression = expression.join(' ');

  const directory = process.cwd();

  if (expression.includes('@version')) {
    // TODO: move this in run-core
    print(await getCurrentVersion());
    return;
  }

  if (expression.includes('@repl')) {
    // TODO: move this in resource/helper
    await runREPL({directory, stage});
    return;
  }

  const output = await runExpression(expression, {directory, stage});
  if (printOutput) {
    output.$print();
  } else if (output && !output.$getIsMethodOutput()) {
    await output['@help']();
  }
}

async function checkVersion() {
  const currentVersion = await getCurrentVersion();

  const latestVersion = await getLatestVersion();
  if (!latestVersion) {
    return;
  }

  if (compareVersions(currentVersion, '<', latestVersion)) {
    print(
      `${formatBold(
        `Run CLI update available ${formatDim(`(${currentVersion} → ${latestVersion})`)}`
      )}, invoke ${formatCode(INSTALL_COMMAND)} to update.`
    );
  }
}

async function getCurrentVersion() {
  const pkg = require('../../../../package.json');
  return pkg.version;
}

async function getLatestVersion() {
  try {
    const cache = new LocalCache({time: LATEST_VERSION_CACHE_TIME});
    const {body} = await get(`${INSTALL_WEBSITE_URL}/releases/latest.txt`, {
      cache,
      timeout: 5000
    });
    return body.trim();
  } catch (err) {
    print(
      `${formatDanger('An error occurred while checking the latest version')} ${formatDim(
        `(${err.message})`
      )}`
    );
    return undefined;
  }
}

(async () => {
  await checkVersion();
  await start();
})().catch(printErrorAndExit);
