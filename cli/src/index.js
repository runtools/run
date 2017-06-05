import {createResource, loadResource} from 'run-core';

export async function run(expression = '', {directory} = {}) {
  let userResource;

  if (directory) {
    userResource = await loadResource(directory, {
      searchInParentDirectories: true,
      throwIfNotFound: false
    });
  }

  const macro = await createResource({$type: 'macro', $expression: expression}, {directory});

  return await macro.$invoke(undefined, {owner: userResource});
}
