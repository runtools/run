import {formatString} from 'run-common';

export function createRuntime(definition: {name: string} | string) {
  if (typeof definition === 'string') {
    const [name, version] = definition.split('@');
    definition = {name, version};
  }

  const Runtime = getRuntimeClass(definition.name);
  return new Runtime(definition);
}

function getRuntimeClass(name) {
  switch (name) {
    case 'node':
      return require('./node').default;
    default:
      throw new Error(`Unimplemented runtime: ${formatString(name)}`);
  }
}
