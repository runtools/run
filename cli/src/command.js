import {resolve, isAbsolute} from 'path';
import {entries, defaults, cloneDeep, defaultsDeep} from 'lodash';
import {throwUserError, checkMistakes, formatCode} from 'run-common';

import Expression from './expression';
import Alias from './alias';
import Argument from './argument';
import Config from './config';
import Runtime from './runtime';

export class Command {
  constructor(cmd) {
    Object.assign(this, cmd);
  }

  static create(tool, obj, context, defaultName) {
    if (!tool) {
      throw new Error("'tool' parameter is missing");
    }

    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('.') || isAbsolute(obj)) {
        obj = {file: obj};
      } else {
        obj = [obj];
      }
    }

    if (Array.isArray(obj)) {
      obj = {run: obj};
    }

    const name = obj.name || defaultName;
    if (!name) {
      throwUserError(`Command ${formatCode('name')} property is missing`, {context});
    }

    context = this.extendContext(context, {name});

    if (!(obj.file || obj.run)) {
      throwUserError(`Command ${formatCode('file')} or  ${formatCode('run')} property is missing`, {
        context
      });
    }

    checkMistakes(obj, {alias: 'aliases', files: 'file', runs: 'run', argument: 'arguments'}, {
      context
    });

    const cmd = new this({
      name,
      aliases: Alias.createMany(obj.aliases || [], context),
      file: obj.file,
      expressions: obj.run && Expression.createMany(obj.run, context),
      arguments: Argument.createMany(obj.arguments || [], context),
      config: Config.create(obj.config || {}, context),
      runtime: obj.runtime && Runtime.create(obj.runtime, context),
      tool
    });

    return cmd;
  }

  static createMany(tool, objs, context) {
    if (!tool) {
      throw new Error("'tool' parameter is missing");
    }

    if (!objs) {
      throw new Error("'objs' parameter is missing");
    }

    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(tool, obj, context));
    }

    return entries(objs).map(([name, obj]) => this.create(tool, obj, context, name));
  }

  static extendContext(base, obj) {
    return {...base, command: formatCode(obj.name)};
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  async run(expression, context) {
    context = this.constructor.extendContext(context, this);

    const defaultArgs = this.arguments.map(arg => arg.default);
    const [_, ...args] = expression.arguments;
    defaults(args, defaultArgs);

    const config = cloneDeep(expression.config);
    defaultsDeep(config, this.config.getDefaults(), this.tool.config.getDefaults());

    if (this.file) {
      const runtime = this.runtime || this.tool.runtime;
      const file = resolve(this.tool.toolDir, this.file);
      return await runtime.run({file, arguments: args, config, context});
    }

    let result;
    for (let cmdExpression of this.expressions) {
      cmdExpression = cmdExpression.resolveVariables({arguments: args, config});
      result = this.tool.run(cmdExpression, context);
    }
    return result;
  }
}

export default Command;
