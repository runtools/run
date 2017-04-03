import {resolve, isAbsolute} from 'path';
import {formatString, formatCode, throwUserError} from 'run-common';

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

  async run(expression, {context}) {
    if (!expression) {
      throw new Error("'expression' argument is missing");
    }

    let commandName = expression.getCommandName();

    if (commandName.startsWith('.')) {
      commandName = resolve(this.dir, commandName);
    }

    let resourceName;
    if (isAbsolute(commandName)) {
      resourceName = Resource.searchResourceFile(commandName);
    } else if (commandName.includes('/')) {
      resourceName = commandName;
    }

    if (resourceName) {
      const resource = await Resource.load(resourceName, {context});
      if (!resource) {
        throwUserError(`Resource ${formatString(resourceName)} not found`, {context});
      }
      const {expression: newExpression} = expression.pullCommandName();
      return await resource.run(newExpression, {context});
    }

    if (this.userResource) {
      return await this.userResource.run(expression, {context});
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
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
