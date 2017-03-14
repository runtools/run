import {omit, entries, camelCase, mapValues, get} from 'lodash';
import minimist from 'minimist';
import {parse} from 'shell-quote';

export class Invocation {
  constructor(invocation) {
    Object.assign(this, invocation);
  }

  static create(array) {
    // 'cook pizza --salami' => {arguments: ['cook', 'pizza'], config: {salami: true}}

    if (!array) {
      throw new Error("'array' property is missing");
    }

    let invocation = array;

    if (typeof invocation === 'string') {
      invocation = parse(invocation, name => ({__var__: name}));
      invocation = invocation.map(part => {
        // Fix '--option=${config.option}' parsing by removing '=' at the end of '--option='
        if (typeof part === 'string' && part.endsWith('=')) {
          part = part.slice(0, -1);
        }
        return part;
      });
    }

    if (!Array.isArray(invocation)) {
      throw new Error("'array' property should be a string or an array");
    }

    invocation = minimist(invocation);

    const args = invocation._;

    const originalConfig = omit(invocation, '_');
    let config = {};
    for (const [key, value] of entries(originalConfig)) {
      config[camelCase(key)] = value;
    }

    invocation = {arguments: args, config};

    return new this(invocation);
  }

  static createMany(arrays = []) {
    if (typeof arrays === 'string') {
      const str = arrays;
      return [this.create(str)];
    }

    if (Array.isArray(arrays)) {
      return arrays.map(obj => this.create(obj));
    }

    throw new Error("'arrays' property should be a string or an array");
  }

  getCommandName() {
    return this.arguments[0];
  }

  resolveVariables({arguments: args, config}) {
    const getter = name => {
      const num = Number(name);
      if (num.toString() === name) {
        return args[num];
      }

      const matches = name.match(/^arguments\[(\d+)\]$/);
      if (matches) {
        const num = Number(matches[1]);
        return args[num];
      }

      if (name === 'config') {
        return config;
      }

      if (name.startsWith('config.')) {
        return get(config, name.slice('config.'.length));
      }

      if (name.startsWith('env.')) {
        return get(process.env, name.slice('env.'.length));
      }

      return undefined;
    };

    const resolvedInvocation = {
      arguments: resolveVars(this.arguments, getter),
      config: resolveVars(this.config, getter)
    };

    return new this.constructor(resolvedInvocation);
  }
}

function resolveVars(value, getter) {
  if (Array.isArray(value)) {
    const array = value;
    return array.map(value => resolveVars(value, getter));
  }

  if (value !== null && typeof value === 'object') {
    const obj = value;
    if ('__var__' in obj) {
      return getter(obj.__var__);
    }
    return mapValues(obj, value => resolveVars(value, getter));
  }

  return value;
}

export default Invocation;
