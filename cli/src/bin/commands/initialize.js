import minimist from 'minimist';

import Package from '../../package';

export async function initialize(args) {
  const opts = minimist(args, {
    boolean: ['yarn'],
    default: {
      yarn: true
    }
  });

  const pkg = new Package();
  await pkg.initialize(opts);
  await pkg.getTools();
}

initialize.aliases = ['init'];
