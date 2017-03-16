import {omit, entries, camelCase, mapValues, get} from 'lodash';
import minimist from 'minimist';
import {parse} from 'shell-quote';
import {throwUserError, formatCode} from 'run-common';

export class Expression {
  constructor(expression) {
    Object.assign(this, expression);
  }

  static create(array, context) {
    // 'cook pizza --salami' => {arguments: ['cook', 'pizza'], config: {salami: true}}

    if (!array) {
      throw new Error("'array' parameter is missing");
    }

    let expression = array;

    if (typeof expression === 'string') {
      expression = parse(expression, name => ({__var__: name}));
      expression = expression.map(part => {
        // Fix '--option=${config.option}' parsing by removing '=' at the end of '--option='
        if (typeof part === 'string' && part.endsWith('=')) {
          part = part.slice(0, -1);
        }
        return part;
      });
    }

    if (!Array.isArray(expression)) {
      throwUserError(`${formatCode('run')} item should be a string or an array`, {context});
    }

    expression = minimist(expression);

    const args = expression._;

    const originalConfig = omit(expression, '_');
    let config = {};
    for (const [key, value] of entries(originalConfig)) {
      config[camelCase(key)] = value;
    }

    expression = {arguments: args, config};

    return new this(expression);
  }

  static createMany(arrays, context) {
    if (typeof arrays === 'string') {
      const str = arrays;
      return [this.create(str, context)];
    }

    if (Array.isArray(arrays)) {
      return arrays.map(obj => this.create(obj, context));
    }

    throwUserError(`${formatCode('run')} property should be a string or an array`, {context});
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

    const resolvedExpression = {
      arguments: resolveVars(this.arguments, getter),
      config: resolveVars(this.config, getter)
    };

    return new this.constructor(resolvedExpression);
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

export default Expression;
