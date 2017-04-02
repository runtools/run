import {resolve, isAbsolute} from 'path';
import {formatCode, throwUserError} from 'run-common';

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

  async run(expression, context) {
    if (!expression) {
      throw new Error("'expression' argument is missing");
    }

    let commandName = expression.getCommandName();

    if (commandName.startsWith('.')) {
      commandName = resolve(this.dir, commandName);
    }

    let implementation;
    let resource;

    if (isAbsolute(commandName)) {
      resource = Resource.searchResourceFile(commandName);
      if (!resource) {
        implementation = commandName;
      }
    } else if (commandName.includes('/')) {
      resource = commandName;
    }

    if (implementation) {
      const {expression: newExpression} = expression.pullCommandName();

      const engine = this.getUserEngine();
      if (!engine) {
        throwUserError('Cannot run a file without an engine', {
          context: {...context, file: implementation}
        });
      }

      return await engine.run({
        file: implementation,
        arguments: newExpression.arguments,
        config: newExpression.config,
        context
      });
    }

    if (resource) {
      const {expression: newExpression} = expression.pullCommandName();
      resource = await Resource.load(resource, {context});
      return await resource.run(this, newExpression, context);
    }

    if (this.userResource) {
      return await this.userResource.run(this, expression, context);
    }

    throwUserError(`Command ${formatCode(commandName)} not found`, {context});
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
