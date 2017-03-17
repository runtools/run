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

  static create(obj, context, defaultName) {
    if (!obj) {
      throw new Error("'obj' parameter is missing");
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('.') || isAbsolute(obj)) {
        obj = {source: obj};
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

    if (!(obj.source || obj.run)) {
      throwUserError(
        `Command ${formatCode('source')} or ${formatCode('run')} property is missing`,
        {
          context
        }
      );
    }

    checkMistakes(
      obj,
      {alias: 'aliases', src: 'source', runs: 'run', argument: 'arguments'},
      {
        context
      }
    );

    const cmd = new this({
      name,
      aliases: Alias.createMany(obj.aliases || [], context),
      source: obj.source,
      expressions: obj.run && Expression.createMany(obj.run, context),
      arguments: Argument.createMany(obj.arguments || [], context),
      config: Config.create(obj.config || {}, context),
      runtime: obj.runtime && Runtime.create(obj.runtime, context)
    });

    return cmd;
  }

  static createMany(objs, context) {
    if (!objs) {
      throw new Error("'objs' parameter is missing");
    }

    if (Array.isArray(objs)) {
      return objs.map(obj => this.create(obj, context));
    }

    return entries(objs).map(([name, obj]) => this.create(obj, context, name));
  }

  static extendContext(base, obj) {
    return {...base, command: formatCode(obj.name)};
  }

  isMatching(name) {
    return this.name === name || this.aliases.find(alias => alias.toString() === name);
  }

  async run(tool, expression, context) {
    context = this.constructor.extendContext(context, this);

    const defaultArgs = this.arguments.map(arg => arg.default);
    const [...args] = expression.arguments;
    defaults(args, defaultArgs);

    const config = cloneDeep(expression.config);
    defaultsDeep(config, this.config.getDefaults(), tool.config.getDefaults());

    if (this.source) {
      const runtime = this.runtime || tool.runtime;
      const file = resolve(tool.toolDir, this.source);
      return await runtime.run({file, arguments: args, config, context});
    }

    let result;
    for (let cmdExpression of this.expressions) {
      cmdExpression = cmdExpression.resolveVariables({arguments: args, config});
      result = tool.run(cmdExpression, context);
    }
    return result;
  }
}

export default Command;
