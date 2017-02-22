'use strict';

import { join } from 'path';
import { existsSync, readFileSync, lstatSync } from 'fs';
import { exec, spawn } from 'child-process-promise';
import { yellow } from 'chalk';
import semver from 'semver';
import {
  getPackage, isYarnPreferred, getJSON, task, createUserError
} from '@voila/common';

const NPM_REGISTRY_URL = 'https://registry.npmjs.org';

export async function installPackageHandler({ pkgDir, type, yarn }) {
  const yarnPreferred = isYarnPreferred({ pkgDir, yarn });

  const message = `Installing ${yellow(type)} using ${yellow(yarnPreferred ? 'yarn' : 'npm')}...`;
  const successMessage = `${yellow(type)} installed`;
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn add ${type} --dev`;
    } else {
      cmd = `npm install ${type} --save-dev`;
    }
    await exec(cmd, { cwd: pkgDir });
  });
}

export async function removePackageHandler({ pkgDir, type, yarn }) {
  const pkg = getPackage(pkgDir);

  if (!(pkg.devDependencies && pkg.devDependencies.hasOwnProperty(type))) return;

  const yarnPreferred = isYarnPreferred({ pkgDir, yarn });

  const message = `Removing ${yellow(type)} using ${yellow(yarnPreferred ? 'yarn' : 'npm')}...`;
  const successMessage = `${yellow(type)} removed`;
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn remove ${type} --dev`;
    } else {
      cmd = `npm rm ${type} --save-dev`;
    }
    await exec(cmd, { cwd: pkgDir });
  });
}

export async function updatePackageHandler({ pkgDir, type, versionRange, isAuto, yarn }) {
  const yarnPreferred = isYarnPreferred({ pkgDir, yarn });

  const message = `${isAuto ? 'Auto-updating' : 'Updating'} ${yellow(type)} using ${yellow(yarnPreferred ? 'yarn' : 'npm')}...`;
  const successMessage = `${yellow(type)} ${isAuto ? 'auto-updated' : 'updated'}`;
  await task(message, successMessage, async () => {
    let cmd;
    if (yarnPreferred) {
      cmd = `yarn upgrade ${type}@${versionRange}`;
    } else {
      cmd = `npm update ${type}`;
    }
    await exec(cmd, { cwd: pkgDir });
  });
}

export async function runPackageHandler({ pkgDir, type, args }) {
  const executable = join(
    pkgDir, 'node_modules', '.bin', packageTypeToExecutableName(type)
  );
  if (!existsSync(executable)) {
    throw createUserError('Package handler not found!', `Are you sure that ${yellow(type)} is a Voilà package handler?`);
  }
  try {
    await spawn(
      `${executable}`, args, { cwd: pkgDir, stdio: 'inherit' }
    );
    return 0;
  } catch (err) {
    return err.code;
  }
}

export async function autoUpdatePackageHandler({ pkgDir, type }) {
  const pkg = getPackage(pkgDir, false);
  if (!pkg) return;

  const versionRange = pkg.devDependencies && pkg.devDependencies[type];
  if (!versionRange) return;

  const validRange = semver.validRange(versionRange);
  if (!validRange) return;
  if (validRange === versionRange) return; // Version is fully specified (no range)

  let publishedHandlerPkg;
  try {
    const url = NPM_REGISTRY_URL + '/' + type.replace('/', '%2F');
    publishedHandlerPkg = await getJSON(url, {
      timeout: 3 * 1000, cacheTime: 24 * 60 * 60 * 1000 // 24 hours
    });
  } catch (err) {
    return;
  }

  const publishedVersions = Object.keys(publishedHandlerPkg.versions);
  const maxVersion = semver.maxSatisfying(publishedVersions, versionRange);
  if (!maxVersion) return;

  const handlerDir = join(pkgDir, 'node_modules', type);
  let stats;
  try { stats = lstatSync(handlerDir); } catch (err) { /* Dir is missing */ }
  if (!stats || stats.isSymbolicLink()) return;

  const handlerPkgFile = join(handlerDir, 'package.json');
  const handlerPkg = JSON.parse(readFileSync(handlerPkgFile, 'utf8'));

  if (!semver.gt(maxVersion, handlerPkg.version)) return; // No updated version

  await updatePackageHandler({ pkgDir, type, versionRange, isAuto: true });
}

function packageTypeToExecutableName(type) {
  let name = type;
  if (name.slice(0, 1) === '@') name = name.slice(1);
  name = name.replace(/\//g, '-');
  return name;
}
