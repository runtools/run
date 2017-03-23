import {formatString, task, throwUserError} from 'run-common';

import {ensurePackageFile, execYarn} from '../common';

export default (async function(names, {peer, optional, packageManager, debug}) {
  await task(
    async () => {
      await ensurePackageFile();
      if (packageManager === 'yarn') {
        const args = ['add', ...names];
        if (peer) {
          args.push('--peer');
        }
        if (optional) {
          args.push('--optional');
        }
        await execYarn(args, {debug});
      } else {
        throwUserError(`Unsupported package manager: ${formatString(packageManager)}`);
      }
    },
    {
      intro: `Adding ${names.length > 1 ? 'dependencies' : 'dependency'}...`,
      outro: `${names.length > 1 ? 'Dependencies' : 'Dependency'} added: ${names
        .map(name => formatString(name))
        .join(', ')}`,
      debug
    }
  );
});
