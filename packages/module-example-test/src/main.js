'use strict';

import ModuleClient from '@voila/module-client';

async function main() {
  const { random } = await ModuleClient.import('https://zbvcbvb18c.execute-api.ap-northeast-1.amazonaws.com/voila_module_example');

  const result = await random();

  console.log(result);
  if (process.browser) document.write('<h1>' + result + '</h1>');
}

main().catch(err => {
  console.error(err);
  if (process.browser) document.write(err.message);
});

export default main;
