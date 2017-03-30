// import {transform} from 'babel-core';
import {task} from 'run-common';

export default (async function(files, {sourceDir, distributionDir, debug}, context) {
  await task(
    async () => {
      console.log(context);
    },
    {
      intro: 'Building package...',
      outro: 'Package built',
      debug
    }
  );
});
