import {join, dirname, basename} from 'path';
import {outputFile, ensureDir} from 'fs-extra';
import tar from 'tar';
import {task, printSuccess, formatPath, formatBold, formatDim} from '@resdir/console';

export default () => ({
  async addRelease({version, macOSExecutable, linuxExecutable}, environment) {
    const releasesDirectory = join(this.$getCurrentDirectory(), this.contentDirectory, 'releases');

    const macOSTarball = join(releasesDirectory, version, `run-v${version}-macos-x64.tar.gz`);
    await this.buildTarball(macOSExecutable, macOSTarball, environment);

    const linuxTarball = join(releasesDirectory, version, `run-v${version}-linux-x64.tar.gz`);
    await this.buildTarball(linuxExecutable, linuxTarball, environment);

    await outputFile(join(releasesDirectory, 'latest.txt'), version);
    printSuccess(`Latest version number updated to ${formatBold(version)}`);
  },

  async buildTarball(source, destination, environment) {
    await task(
      async progress => {
        const cwd = dirname(source);
        source = basename(source);
        await ensureDir(dirname(destination));
        await tar.c({cwd, file: destination, gzip: true}, [source]);
        progress.setOutro(`Tarball built ${formatDim(`(${formatPath(basename(destination))})`)}`);
      },
      {intro: `Building tarball...`, outro: `Tarball built`},
      environment
    );
  }
});
