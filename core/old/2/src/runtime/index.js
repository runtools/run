import {formatString} from 'run-common';

import NodeRuntime from './node';

const RUNTIMES = {node: NodeRuntime};

export function createRuntime(definition: {name: string} | string) {
  if (typeof definition === 'string') {
    const [name, version] = definition.split('@');
    definition = {name, version};
  }

  const Runtime = RUNTIMES[definition.name];
  if (!Runtime) {
    throw new Error(`Unimplemented runtime: ${formatString(definition.name)}`);
  }
  return new Runtime(definition);
}

export default createRuntime;
