import {join, resolve, isAbsolute} from 'path';
import {cloneDeep, defaultsDeep} from 'lodash';
import {formatPath, formatCode, throwUserError} from 'run-common';

import Tool from './tool';
import Config from './config';
import Engine from './engine';

export class Runner {
  constructor(runner) {
    Object.assign(this, runner);
  }

  static async create(dir, {config = {}, engine} = {}) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    ({config, engine} = await Tool.loadGlobals(dir, {config, engine}));

    const runner = new this({dir, config, engine});

    return runner;
  }

  async run(expression, context, dir = this.dir) {
    if (!expression) {
      throw new Error("'expression' argument is missing");
    }

    let config;
    ({config, expression} = expression.pullConfigProperty('config'));
    if (config) {
      config = resolve(this.dir, config);
      config = await Config.load(config);
      defaultsDeep(config, this.config);
    }

    let engine;
    ({engine, expression} = expression.pullConfigProperty('engine'));
    if (engine) {
      engine = Engine.create(engine, context);
    }

    if (config || engine) {
      const runner = new this.constructor({
        dir: this.dir,
        config: config || this.config,
        engine: engine || this.engine
      });
      return await runner.run(expression, context);
    }

    let cmdName = expression.getCommandName();

    if (cmdName.startsWith('.')) {
      cmdName = resolve(this.dir, cmdName);
    }

    let cmdSource;
    let toolSource;

    if (isAbsolute(cmdName)) {
      toolSource = Tool.searchToolFile(cmdName);
      if (!toolSource) {
        cmdSource = cmdName;
      }
    } else if (cmdName === 'tool' || cmdName.includes('/')) {
      toolSource = cmdName;
    }

    if (cmdSource) {
      const {commandName: file, expression: newExpression} = expression.pullCommandName();

      if (!this.engine) {
        throwUserError('Cannot run a file without an engine', {
          context: {...context, file: formatPath(file)}
        });
      }

      const args = newExpression.arguments;
      const config = cloneDeep(newExpression.config);
      defaultsDeep(config, this.config);

      return await this.engine.run({file, arguments: args, config, context});
    }

    if (toolSource) {
      const {expression: newExpression} = expression.pullCommandName();
      const tool = await Tool.import(this.dir, toolSource, context);
      return await tool.run(this, newExpression, context);
    }

    const tool = await Tool.load(dir);
    if (tool && tool.canRun(expression)) {
      return await tool.run(this, expression, context);
    }

    const parentDir = join(dir, '..');
    if (parentDir !== dir) {
      return await this.run(expression, context, parentDir);
    }

    throwUserError(`Command ${formatCode(cmdName)} not found`, {context});
  }

  async runMany(expressions) {
    if (!expressions) {
      throw new Error("'expressions' argument is missing");
    }

    if (!expressions.length) {
      console.log('TODO: display general help');
      return;
    }

    let result;
    for (const expression of expressions) {
      result = await this.run(expression);
    }
    return result;
  }
}

export default Runner;
