import PackageDefinition from '../../package-definition';

export async function initialize(args) {
  const pkgDef = await PackageDefinition.create();
  console.dir(pkgDef, {depth: 5});
}

initialize.aliases = ['init'];
