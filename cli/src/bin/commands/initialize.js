import Package from '../../package';

export async function initialize(args) {
  const pkg = await Package.create();

  console.dir(pkg, {depth: 5});
}

initialize.aliases = ['init'];
