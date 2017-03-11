import {join, sep} from 'path';
import {existsSync, mkdirSync} from 'fs';
import {writeFileSync as writeJSON} from 'jsonfile';

import {getHighDir} from 'run-shared';

const INSTALLER = {
  name: undefined,
  version: '1.0.0',
  private: true,
  dependencies: {}
};

export class InstallerStore {
  async getInstaller({name, version}) {
    if (!this._installers) {
      this._installers = {};
    }

    let installerName = `${name}-${version}-installer`;

    if (!this._installers[installerName]) {
      const installerStoreDir = this.getInstallerStoreDir();
      const platformCompatibleInstallerName = installerName.replace(/\//g, sep);
      const installerDir = join(installerStoreDir, platformCompatibleInstallerName);

      if (!existsSync(installerDir)) {
        if (platformCompatibleInstallerName.includes(sep)) {
          // Create the scoped directory
          const parentDirName = platformCompatibleInstallerName.split(sep)[0];
          const parentDir = join(installerStoreDir, parentDirName);
          if (!existsSync(parentDir)) {
            mkdirSync(parentDir);
          }
        }
        mkdirSync(installerDir);
        const file = join(installerDir, 'package.json');
        const content = {...INSTALLER, name: installerName};
        content.dependencies[name] = version;
        writeJSON(file, content);
      }

      this._installers[installerName] = {installerName, installerDir};
    }

    return this._installers[installerName];
  }

  getInstallerStoreDir() {
    if (!this._installerStoreDir) {
      const dir = join(getHighDir(), 'installers');
      if (!existsSync(dir)) {
        mkdirSync(dir);
      }
      this._installerStoreDir = dir;
    }
    return this._installerStoreDir;
  }
}

export const installerStore = new InstallerStore();

export default installerStore;
