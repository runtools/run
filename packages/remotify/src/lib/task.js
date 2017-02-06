'use strict';

import ora from 'ora';

export default async function task(message, fn) {
  const spinner = ora(message).start();
  try {
    const result = await fn(spinner);
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}
