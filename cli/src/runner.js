import {resolve, isAbsolute} from 'path';
import {formatString, throwUserError} from 'run-common';

import Resource from './resource';

export class Runner {
  constructor(runner) {
    Object.assign(this, runner);
  }

  static async create(dir) {
    if (!dir) {
      throw new Error("'dir' argument is missing");
    }

    const userResource = await Resource.loadUserResource(dir);

    const runner = new this({dir, userResource});

    return runner;
  }

  static extendContext(base, runner) {
    const context = {...base};
    if (runner.userResource) {
      context.userResource = runner.userResource.__file__;
    }
    return context;
  }

  async run(expression, {context}) {
    if (!expression) {
      throw new Error("'expression' argument is missing");
    }

    context = this.constructor.extendContext(context, this);

    let commandName = expression.getCommandName();

    if (commandName.startsWith('.')) {
      commandName = resolve(this.dir, commandName);
    }

    if (commandName.includes('/') || isAbsolute(commandName)) {
      const resource = await Resource.load(commandName, {context});
      if (!resource) {
        throwUserError(`Resource ${formatString(commandName)} not found`, {context});
      }
      const {expression: newExpression} = expression.pullCommandName();
      return await resource.run(newExpression, {context});
    }

    if (this.userResource) {
      return await this.userResource.run(expression, {context});
    }

    throwUserError('User resource not found', {context});
  }

  async runMany(expressions, {context} = {}) {
    if (!expressions) {
      throw new Error("'expressions' argument is missing");
    }

    if (!expressions.length) {
      console.log('TODO: display general help');
      return;
    }

    let result;
    for (const expression of expressions) {
      result = await this.run(expression, {context});
    }
    return result;
  }
}

export default Runner;
