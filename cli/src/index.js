import {Resource} from 'run-core';
import {session} from '@resdir/console';

export async function run(expression = '', {directory} = {}) {
  let userResource;

  if (directory) {
    userResource = await Resource.$load(directory, {
      searchInParentDirectories: true,
      throwIfNotFound: false
    });
  }

  let resource = userResource;
  if (!resource) {
    resource = await Resource.$create(undefined, {directory});
  }

  const method = await Resource.$create({'@type': 'method', '@run': expression}, {directory});

  return await session(async () => {
    return await method.$invoke(undefined, {parent: resource});
  });
}
