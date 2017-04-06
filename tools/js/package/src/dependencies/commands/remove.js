import {formatString, task} from 'run-common';

import {JSPackage} from '../..';

export default (async function(args, config, context) {
  // TODO: The resource should come from the engine
  const resource = await JSPackage.load(context.userResource);
  return remove.call(resource, args, config, context);
});

async function remove(names, {debug}, context) {
  for (const name of names) {
    await task(
      async () => {
        await this.removeDependency(name, {context});
        await this.updateDependencies({debug, context});
      },
      {
        intro: `Removing ${formatString(name)} dependency...`,
        outro: `Dependency ${formatString(name)} removed`,
        debug
      }
    );

    await this.save({context});
  }
}
