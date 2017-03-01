import {join, relative, sep} from 'path';
import {existsSync, mkdirSync} from 'fs';
import {readFileSync as readJSON, writeFileSync as writeJSON} from 'jsonfile';
import {exec} from 'child-process-promise';

import {getHighDir, task, formatPath, createUserError} from '@high/shared';

const REPOSITORY = {
  name: 'repository',
  version: '1.0.0',
  private: true,
  dependencies: {}
};

const INSTALLER = {
  name: undefined,
  version: '1.0.0',
  private: true,
  dependencies: {}
};

export class Repository {
  async loadPackage({name, version}) {
    const packageDir = await this.searchPackageDir({name, version});
    const packageContent = readJSON(join(packageDir, 'package.json'));
    return {packageDir, packageContent};
  }

  async searchPackageDir({name, version}) {
    const platformCompatibleName = name.replace(/\//g, sep); // For scoped packages

    const installerName = await this.getInstaller({name, version});
    const platformCompatibleInstallerName = installerName.replace(/\//g, sep);

    const repositoryDir = this.getRepositoryDir();
    let dir;

    // First, search in the installed installer node_modules directory
    dir = join(
      repositoryDir,
      'node_modules',
      platformCompatibleInstallerName,
      'node_modules',
      platformCompatibleName
    );
    if (existsSync(dir)) {
      return dir;
    }

    // Second, search in the repository node_modules directory
    dir = join(repositoryDir, 'node_modules', platformCompatibleName);
    if (existsSync(dir)) {
      return dir;
    }

    throw createUserError(`Package ${formatPath(`${name}@${version}`)} cannot be found!`);
  }

  async getInstaller({name, version}) {
    const {installerName, installerDir} = this.generateInstaller({name, version});
    const repositoryFileContent = this.loadRepositoryFileContent();
    if (!repositoryFileContent.dependencies[installerName]) {
      await this.installPackage({name, version, installerDir});
      this.repositoryFileContentDidChange();
    }
    return installerName;
  }

  generateInstaller({name, version}) {
    let installerName = `${name}-${version}-installer`;

    if (!this._installers) {
      this._installers = {};
    }

    if (!this._installers[installerName]) {
      const installersDir = this.getInstallersDir();
      const platformCompatibleInstallerName = installerName.replace(/\//g, sep);
      const installerDir = join(installersDir, platformCompatibleInstallerName);

      if (!existsSync(installerDir)) {
        if (platformCompatibleInstallerName.includes(sep)) {
          // Ensure the scoped directory existance
          const parentDirName = platformCompatibleInstallerName.split(sep)[0];
          const parentDir = join(installersDir, parentDirName);
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

  getRepositoryDir() {
    if (!this._repositoryDir) {
      const dir = join(getHighDir(), 'repository');
      if (!existsSync(dir)) {
        mkdirSync(dir);
      }
      this._repositoryDir = dir;
    }
    return this._repositoryDir;
  }

  getRepositoryFile() {
    return join(this.getRepositoryDir(), 'package.json');
  }

  loadRepositoryFileContent() {
    if (!this._repositoryFileContent) {
      const file = this.getRepositoryFile();
      let content;
      try {
        content = readJSON(file);
      } catch (err) {
        content = {...REPOSITORY};
        writeJSON(file, content);
      }
      this._repositoryFileContent = content;
    }
    return this._repositoryFileContent;
  }

  repositoryFileContentDidChange() {
    this._repositoryFileContent = undefined;
  }

  getInstallersDir() {
    if (!this._installersDir) {
      const dir = join(this.getRepositoryDir(), 'installers');
      if (!existsSync(dir)) {
        mkdirSync(dir);
      }
      this._installersDir = dir;
    }
    return this._installersDir;
  }

  async installPackage({name, version, installerDir}) {
    const nameWithVersion = `${name}@${version}`;
    const message = `Installing ${formatPath(nameWithVersion)}...`;
    const successMessage = `${formatPath(nameWithVersion)} installed`;
    await task(message, successMessage, async () => {
      const repositoryDir = this.getRepositoryDir();
      const installerURL = 'file:./' + relative(repositoryDir, installerDir);
      const cmd = `yarn add ${installerURL} --no-progress --no-emoji --non-interactive --no-bin-links `;
      await exec(cmd, {cwd: repositoryDir});
    });
  }
}

export const repository = new Repository();

export default repository;
