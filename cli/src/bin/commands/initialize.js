import minimist from 'minimist';

import Package from '../../package';

export async function initialize(args) {
  const opts = minimist(args, {
    string: ['type'],
    boolean: ['yarn'],
    default: {
      yarn: null
    }
  });

  const pkg = new Package(opts);
  await pkg.initialize();
  await pkg.installOrUpdatePackage();
}

initialize.aliases = ['init'];
