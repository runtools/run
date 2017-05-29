import Resource from './resources';
import Macro from './resources/macro';

export async function run(expression = '', {directory} = {}) {
  let userResource;

  if (directory) {
    userResource = await Resource.$load(directory, {
      searchInParentDirectories: true,
      throwIfNotFound: false
    });
  }

  const macro = await Macro.$create({$expression: expression}, {directory});

  return await macro.$invoke(undefined, {owner: userResource});
}
