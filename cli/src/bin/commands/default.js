import Tool from '../../tool';

export async function __default__(invocation) {
  invocation.name = invocation.arguments.shift();

  const tool = await Tool.load(process.cwd());
  // console.dir(tool, {depth: 10});
  await tool.run(invocation);

  // const pkgDef = await PackageDefinition.load();
  // const pkg = await Package.create(pkgDef);
  // // console.dir(pkg, {depth: 10});
  // pkg.runCommand(args);
}

//
// import minimist from 'minimist';
// import {cyan} from 'chalk';
// import {getPackageDirOption, getPackage, createUserError, showErrorAndExit} from '@voila/common';
// import {autoUpdatePackageHandler, runPackageHandler} from '../package-handler';
//
// (async function() {
//   const pkgDir = getPackageDirOption();
//
//   const pkg = getPackage(pkgDir);
//
//   const config = pkg.voila || {};
//
//   const type = config.type;
//   if (!type) {
//     throw createUserError(
//       'Unknown package type!',
//       `Please run ${cyan('`voila init <package-type>`')} at the root of your package to initialize it.`
//     );
//   }
//
//   const argv = minimist(process.argv.slice(2), {
//     boolean: ['auto-update'],
//     default: {
//       'auto-update': null
//     }
//   });
//
//   let autoUpdate = argv['auto-update'];
//   if (autoUpdate == null) {
//     autoUpdate = config.autoUpdate;
//   }
//   if (autoUpdate == null) {
//     autoUpdate = true;
//   }
//
//   if (autoUpdate) {
//     await autoUpdatePackageHandler({pkgDir, type});
//   }
//
//   const args = process.argv.slice(2);
//   const code = await runPackageHandler({pkgDir, type, args});
//   if (code) {
//     process.exit(code);
//   }
// })().catch(showErrorAndExit);
