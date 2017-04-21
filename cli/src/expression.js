import {omit, mapValues, get} from 'lodash';
import {parse} from 'shell-quote';
import {parseCommandLineArguments} from 'run-common';

import Config from './config';

export class Expression {
  constructor(definition: Array | Expression, {currentDir} = {}) {
    let def = definition;

    if (Array.isArray(def)) {
      const {arguments: args, options} = parseCommandLineArguments(def);
      def = {arguments: args, config: Config.normalize(options)};
    } else {
      currentDir = definition.getCurrentDir();
    }

    this.setCurrentDir(currentDir);

    this.arguments = def.arguments;
    this.config = def.config;
  }

  clone() {
    return new this.constructor(this);
  }

  getCurrentDir() {
    return this.__currentDir__;
  }

  setCurrentDir(dir) {
    this.__currentDir__ = dir;
  }

  getFirstArgument() {
    return this.arguments[0];
  }

  pullFirstArgument() {
    const [firstArgument, ...args] = this.arguments;
    const expression = this.clone();
    expression.arguments = args;
    return {firstArgument, expression};
  }

  pullConfigProperty(name) {
    if (!(name in this.config)) {
      return {expression: this};
    }
    const value = this.config[name];
    const config = omit(this.config, name);
    const expression = this.clone();
    expression.config = config;
    return {[name]: value, expression};
  }

  static createMany(definitions: Array = [], {currentDir} = {}) {
    return definitions.map(definition => new this(definition, {currentDir}));
  }

  static parse(args: Array | string = []) {
    const definitions = [];

    if (typeof args === 'string') {
      args = parse(args, name => ({__var__: name}));
      args = args.map(arg => {
        // Fix '--option=${config.option}' parsing by removing '=' at the end of '--option='
        if (typeof arg === 'string' && arg.endsWith('=')) {
          arg = arg.slice(0, -1);
        }
        return arg;
      });
    }

    // Extract expressions by finding commas at the end of args
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

    return definitions;
  }

  resolveVariables({arguments: args, config}) {
    // TODO

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
  // TODO

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
