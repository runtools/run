import {formatString, task} from 'run-common';

import JSESNextPackage from '../..';

export default (async function(args, config, context) {
  // TODO: The resource should come from the engine
  const resource = await JSESNextPackage.load(context.userResource);
  return build.call(resource, args, config, context);
});

async function build([files], {debug}, context) {
  await task(
    async () => {
      await this.build({files, debug, context});
    },
    {
      intro: `Building ${formatString(this.name)} package...`,
      outro: `Package ${formatString(this.name)} built`,
      debug
    }
  );
}
