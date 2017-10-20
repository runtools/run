import {takeProperty} from '@resdir/util';

const POSITIONAL_ARGUMENT_PREFIX = '@$';

export function takeArgument(args, key, aliases) {
  return takeProperty(args, key, aliases);
}

export function getFirstArgument(args) {
  return args[makePositionalArgumentKey(0)];
}

export function shiftArguments(args) {
  let firstArgument;
  let key;
  let previousKey;
  let position = 0;
  while (true) {
    previousKey = key;
    key = makePositionalArgumentKey(position);
    if (!(key in args)) {
      break;
    }
    if (position === 0) {
      firstArgument = args[key];
    } else {
      args[previousKey] = args[key];
    }
    delete args[key];
    position++;
  }
  return firstArgument;
}

export function findPositionalArguments(args) {
  const positionalArguments = [];
  let position = 0;
  while (true) {
    const key = makePositionalArgumentKey(position);
    if (!(key in args)) {
      break;
    }
    positionalArguments.push(args[key]);
    position++;
  }
  return positionalArguments;
}

export function makePositionalArgumentKey(position) {
  return POSITIONAL_ARGUMENT_PREFIX + String(position);
}
