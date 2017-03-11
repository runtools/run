import {join, relative, sep} from 'path';
import {existsSync, mkdirSync} from 'fs';
import {readFileSync as readJSON, writeFileSync as writeJSON} from 'jsonfile';
import {exec} from 'child-process-promise';

import {getHighDir, task, formatPath, createUserError} from 'run-shared';

import installerStore from './installer-store';

const PACKAGE_STORE = {
  name: 'package-store',
  version: '1.0.0',
  private: true,
  dependencies: {}
};

export class PackageStore {
  async loadPackage({name, version}) {
    const packageDir = await this.searchPackage({name, version});
    const packageContent = readJSON(join(packageDir, 'package.json'));
    return {packageDir, packageContent};
  }

  async searchPackage({name, version}) {
    const platformCompatibleName = name.replace(/\//g, sep); // For scoped packages

    const {installerName, installerDir} = await installerStore.getInstaller({name, version});

    // Ensure that the installer has already beeen installed
    const packageStoreFile = this.loadPackageStoreFile();
    if (!packageStoreFile.dependencies[installerName]) {
      await this.installPackage({name, version, installerDir});
    }

    const packageStoreDir = this.getPackageStoreDir();
    const platformCompatibleInstallerName = installerName.replace(/\//g, sep);

    let dir;

    // First, search in the installed installer
    dir = join(
      packageStoreDir,
      'node_modules',
      platformCompatibleInstallerName,
      'node_modules',
      platformCompatibleName
    );
    if (existsSync(dir)) {
      return dir;
    }

    // Second, search at the root of the package store
    dir = join(packageStoreDir, 'node_modules', platformCompatibleName);
    if (existsSync(dir)) {
      return dir;
    }

    throw createUserError(`Package ${formatPath(`${name}@${version}`)} cannot be found!`);
  }

  getPackageStoreDir() {
    if (!this._packageStoreDir) {
      const dir = join(getHighDir(), 'packages');
      if (!existsSync(dir)) {
        mkdirSync(dir);
      }
      this._packageStoreDir = dir;
    }
    return this._packageStoreDir;
  }

  loadPackageStoreFile() {
    if (!this._packageStoreFile) {
      const file = join(this.getPackageStoreDir(), 'package.json');
      let content;
      try {
        content = readJSON(file);
      } catch (err) {
        content = {...PACKAGE_STORE};
        writeJSON(file, content);
      }
      this._packageStoreFile = content;
    }
    return this._packageStoreFile;
  }

  packageStoreFileDidChange() {
    this._packageStoreFile = undefined;
  }

  async installPackage({name, version, installerDir}) {
    const nameWithVersion = `${name}@${version}`;
    const message = `Installing ${formatPath(nameWithVersion)}...`;
    const successMessage = `${formatPath(nameWithVersion)} installed`;
    await task(message, successMessage, async () => {
      const packageStoreDir = this.getPackageStoreDir();
      const installerURL = 'file:' + relative(packageStoreDir, installerDir);
      const cmd = `yarn add ${installerURL} --no-progress --no-emoji --non-interactive --no-bin-links `;
      await exec(cmd, {cwd: packageStoreDir});
      this.packageStoreFileDidChange();
    });
  }
}

export const packageStore = new PackageStore();

export default packageStore;
