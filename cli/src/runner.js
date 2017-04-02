import {resolve, isAbsolute} from 'path';
import {cloneDeep, defaultsDeep} from 'lodash';
import {formatCode, throwUserError} from 'run-common';

import Resource from './resource';
import Config from './config';
import Engine from './engine';

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

    if (this.userResource) {
      context = {...context, userResource: this.userResource.resourceFile};

      let userResource = this.userResource;

      let config;
      ({config, expression} = expression.pullConfigProperty('config'));
      if (config) {
        config = resolve(this.dir, config);
        config = await Config.load(config);
        defaultsDeep(config, userResource.config);
        userResource = new userResource.constructor({...userResource, config});
      }

      let engine;
      ({engine, expression} = expression.pullConfigProperty('engine'));
      if (engine) {
        engine = Engine.create(engine, context);
        userResource = new userResource.constructor({...userResource, engine});
      }

      if (userResource !== this.userResource) {
        const runner = new this.constructor({...this, userResource});
        return await runner.run(expression, context);
      }
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

      const args = newExpression.arguments;
      const config = cloneDeep(newExpression.config);
      defaultsDeep(config, this.getUserConfig());

      return await engine.run({file: implementation, arguments: args, config, context});
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

  getUserConfig() {
    return this.userResource && this.userResource.getConfig && this.userResource.getConfig();
  }

  getUserEngine() {
    return this.userResource && this.userResource.getEngine && this.userResource.getEngine();
  }
}

export default Runner;
