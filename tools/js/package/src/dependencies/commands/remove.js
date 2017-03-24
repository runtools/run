import {formatString, task, throwUserError} from 'run-common';

import {ensurePackageFile, execYarn} from '../common';

export default (async function(names, {packageManager, debug}) {
  await task(
    async () => {
      await ensurePackageFile();
      if (packageManager === 'yarn') {
        await execYarn(['remove', ...names], {debug});
      } else {
        throwUserError(`Unsupported package manager: ${formatString(packageManager)}`);
      }
    },
    {
      intro: `Removing ${names.length > 1 ? 'dependencies' : 'dependency'}...`,
      outro: `${names.length > 1 ? 'Dependencies' : 'Dependency'} removed: ${names
        .map(name => formatString(name))
        .join(', ')}`,
      debug
    }
  );
});
