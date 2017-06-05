import {Resource, MacroResource} from 'run-core';

export async function run(expression = '', {directory} = {}) {
  let userResource;

  if (directory) {
    userResource = await Resource.$load(directory, {
      searchInParentDirectories: true,
      throwIfNotFound: false
    });
  }

  const macro = await MacroResource.$create({$expression: expression}, {directory});

  return await macro.$invoke(undefined, {owner: userResource});
}
