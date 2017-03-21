import {resolve} from 'path';
import {omit, mapValues, get} from 'lodash';
import minimist from 'minimist';
import {parse} from 'shell-quote';
import {throwUserError, formatCode} from 'run-common';

import Config from './config';

export class Expression {
  constructor(expression) {
    Object.assign(this, expression);
  }

  static create(dir, definition, context) {
    // ['cook' 'pizza' '--salami'] => {arguments: ['cook', 'pizza'], config: {salami: true}}

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    if (!Array.isArray(definition)) {
      throwUserError(`A ${formatCode('run')} item should be a an array`, {context});
    }

    let expression = minimist(definition);

    const args = expression._;

    let commandName = args[0];
    if (!commandName) {
      throwUserError(`An expression must contain a command name`, {context});
    }

    if (commandName.startsWith('.')) {
      commandName = resolve(dir, commandName);
      args[0] = commandName;
    }

    let config = omit(expression, '_');
    config = Config.normalize(config);

    expression = {arguments: args, config};

    return new this(expression);
  }

  static createMany(dir, definitions, context) {
    if (typeof definitions === 'string') {
      const str = definitions;
      let args = parse(str, name => ({__var__: name}));
      args = args.map(part => {
        // Fix '--option=${config.option}' parsing by removing '=' at the end of '--option='
        if (typeof part === 'string' && part.endsWith('=')) {
          part = part.slice(0, -1);
        }
        return part;
      });
      return this.createManyFromShell(dir, args, context);
    }

    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(dir, definition, context));
    }

    throwUserError(`${formatCode('run')} property should be a string or an array`, {context});
  }

  static createManyFromShell(dir, args, context) {
    if (!args) {
      throw new Error("'args' argument is missing");
    }

    const definitions = [];

    let newArray = true;
    for (let arg of args) {
      if (newArray) {
        definitions.push([]);
        newArray = false;
      }
      if (typeof arg === 'string' && arg.endsWith(',')) {
        arg = arg.slice(0, -1);
        newArray = true;
      }
      if (arg) {
        definitions[definitions.length - 1].push(arg);
      }
    }

    return this.createMany(dir, definitions, context);
  }

  getCommandName() {
    return this.arguments[0];
  }

  pullCommandName() {
    const [commandName, ...args] = this.arguments;
    const expression = new this.constructor({arguments: args, config: this.config});
    return {commandName, expression};
  }

  pullConfigProperty(name) {
    if (!(name in this.config)) {
      return {expression: this};
    }

    const value = this.config[name];
    const config = omit(this.config, name);
    const expression = new this.constructor({arguments: this.arguments, config});
    return {[name]: value, expression};
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

    const resolvedArguments = resolveVars(this.arguments, getter);
    const resolvedConfig = resolveVars(this.config, getter);

    return new this.constructor({
      arguments: resolvedArguments,
      config: resolvedConfig
    });
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
