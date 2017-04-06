import {omit, mapValues, get} from 'lodash';
import {parse} from 'shell-quote';
import {parseCommandLineArguments, throwUserError, formatCode} from 'run-common';

import Config from './config';

export class Expression {
  constructor(expression) {
    Object.assign(this, expression);
  }

  static create(definition, {dir, context}) {
    // ['cook' 'pizza' '--salami'] => {arguments: ['cook', 'pizza'], config: {salami: true}}

    if (!definition) {
      throw new Error("'definition' argument is missing");
    }

    if (!Array.isArray(definition)) {
      throwUserError(`An expression must be a an array`, {context});
    }

    let {arguments: args, options: config} = parseCommandLineArguments(definition, {context});

    if (!args.length) {
      throwUserError(`An expression must contain at least one argument`, {context});
    }

    config = Config.normalize(config, {context});

    return new this({arguments: args, config, dir});
  }

  static createMany(definitions, {dir, context}) {
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
      return this.createManyFromShell(args, {dir, context});
    }

    if (Array.isArray(definitions)) {
      return definitions.map(definition => this.create(definition, {dir, context}));
    }

    throwUserError(`${formatCode('run')} property should be a string or an array`, {context});
  }

  static createManyFromShell(args, {dir, context}) {
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

    return this.createMany(definitions, {dir, context});
  }

  getCommandName() {
    return this.arguments[0];
  }

  pullCommandName() {
    const [commandName, ...args] = this.arguments;
    const expression = new this.constructor({...this, arguments: args});
    return {commandName, expression};
  }

  pullConfigProperty(name) {
    if (!(name in this.config)) {
      return {expression: this};
    }

    const value = this.config[name];
    const config = omit(this.config, name);
    const expression = new this.constructor({...this, config});
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

    return new this.constructor({...this, arguments: resolvedArguments, config: resolvedConfig});
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
