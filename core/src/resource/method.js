import {isAbsolute} from 'path';
import {isEmpty, isPlainObject, difference} from 'lodash';
import {takeProperty} from '@resdir/util';
import {catchContext, formatCode} from '@resdir/console';
import {
  parseExpression,
  isParsedExpression,
  matchExpression,
  getPositionalArgument,
  shiftPositionalArguments
} from '@resdir/expression';

import Resource from '../resource';
import Value from './value';

export class MethodResource extends Resource {
  static $RESOURCE_TYPE = 'method';

  async $construct(definition, options) {
    definition = {...definition};

    const input = takeProperty(definition, '@input');
    const output = takeProperty(definition, '@output');
    const runExpression = takeProperty(definition, '@run');
    const beforeExpression = takeProperty(definition, '@before');
    const afterExpression = takeProperty(definition, '@after');
    const listenedEvents = takeProperty(definition, '@listen');
    const unlistenedEvents = takeProperty(definition, '@unlisten');

    await super.$construct(definition, options);

    await catchContext(this, async () => {
      if (input !== undefined) {
        await this.$setInput(input);
      }
      if (output !== undefined) {
        await this.$setOutput(output);
      }
      if (runExpression !== undefined) {
        this.$runExpression = runExpression;
      }
      if (beforeExpression !== undefined) {
        this.$beforeExpression = beforeExpression;
      }
      if (afterExpression !== undefined) {
        this.$afterExpression = afterExpression;
      }
      if (listenedEvents !== undefined) {
        this.$listenedEvents = listenedEvents;
      }
      if (unlistenedEvents !== undefined) {
        this.$unlistenedEvents = unlistenedEvents;
      }
    });
  }

  $getInput() {
    return this._getInheritedValue('_input');
  }

  async $setInput(input) {
    if (input === undefined) {
      this._input = undefined;
      return;
    }
    if (!isPlainObject(input)) {
      throw new Error(`${formatCode('@input')} property must be an object`);
    }
    input = await this.constructor.$create(input);
    input.$setIsOpenByDefault(false);
    this._input = input;
  }

  $getOutput() {
    return this._getInheritedValue('_output');
  }

  async $setOutput(output) {
    if (output === undefined) {
      this._output = undefined;
      return;
    }
    if (!isPlainObject(output)) {
      throw new Error(`${formatCode('@output')} property must be an object`);
    }
    output = await this.constructor.$create(output);
    output.$setIsOpenByDefault(false);
    this._output = output;
  }

  get $runExpression() {
    return this._getInheritedValue('_runExpression');
  }

  set $runExpression(runExpression) {
    if (typeof runExpression === 'string') {
      runExpression = [runExpression];
    }
    this._runExpression = runExpression;
  }

  get $beforeExpression() {
    return this._beforeExpression;
  }

  set $beforeExpression(beforeExpression) {
    if (typeof beforeExpression === 'string') {
      beforeExpression = [beforeExpression];
    }
    this._beforeExpression = beforeExpression;
  }

  $getAllBeforeExpressions() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._beforeExpression) {
          expression.unshift(...method._beforeExpression);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  get $afterExpression() {
    return this._afterExpression;
  }

  set $afterExpression(afterExpression) {
    if (typeof afterExpression === 'string') {
      afterExpression = [afterExpression];
    }
    this._afterExpression = afterExpression;
  }

  $getAllAfterExpressions() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._afterExpression) {
          expression.push(...method._afterExpression);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  get $listenedEvents() {
    return this._listenedEvents;
  }

  set $listenedEvents(events) {
    if (!Array.isArray(events)) {
      events = [events];
    }
    this._listenedEvents = events;
  }

  get $unlistenedEvents() {
    return this._unlistenedEvents;
  }

  set $unlistenedEvents(events) {
    if (!Array.isArray(events)) {
      events = [events];
    }
    this._unlistenedEvents = events;
  }

  $getAllListenedEvents() {
    const listenedEvents = [];
    const unlistenedEvents = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._listenedEvents) {
          for (const event of method._listenedEvents) {
            if (!listenedEvents.includes(event)) {
              listenedEvents.push(event);
            }
          }
        }
        if (method._unlistenedEvents) {
          for (const event of method._unlistenedEvents) {
            if (!unlistenedEvents.includes(event)) {
              unlistenedEvents.push(event);
            }
          }
        }
      },
      {deepSearch: true}
    );
    return difference(listenedEvents, unlistenedEvents);
  }

  $defaultAutoUnboxing = true;

  $unbox() {
    return this.$getFunction({autoUnbox: true});
  }

  $getFunction({autoUnbox} = {}) {
    const methodResource = this;

    return async function (input, environment, ...rest) {
      if (rest.length !== 0) {
        throw new TypeError(`A resource method must be invoked with a maximum of two arguments (${formatCode('input')} and ${formatCode('environment')})`);
      }

      const {
        normalizedInput,
        normalizedEnvironment
      } = await methodResource._normalizeInputAndEnvironment(input, environment);

      const implementation = methodResource._getImplementation(this);
      if (!implementation) {
        throw new Error(`Can't find implementation for ${formatCode(methodResource.$getKey())}`);
      }

      const beforeExpression = methodResource.$getAllBeforeExpressions();
      if (beforeExpression.length) {
        await methodResource._run(beforeExpression, normalizedInput, {parent: this});
      }

      const output = await implementation.call(this, normalizedInput, normalizedEnvironment);

      let normalizedOutput = await methodResource._normalizeOutput(output);

      if (normalizedOutput !== undefined && autoUnbox) {
        normalizedOutput = normalizedOutput.$autoUnbox();
      }

      const afterExpression = methodResource.$getAllAfterExpressions();
      if (afterExpression.length) {
        await methodResource._run(afterExpression, normalizedInput, {parent: this});
      }

      return normalizedOutput;
    };
  }

  async _normalizeInputAndEnvironment(input, environment) {
    if (input instanceof Resource) {
      // TODO: Check input compatibility
      return input;
    }

    // if (input !== undefined && !isPlainObject(input)) {
    //   throw new TypeError(`Resource method input is invalid`);
    // }

    let extractedEnvironment;

    const inputIsParsedExpression = input !== undefined && isParsedExpression(input);

    if (inputIsParsedExpression) {
      let result;
      let remainder;

      const inputSchema = this._getInputSchema();
      ({result, remainder} = matchExpression(input, inputSchema));
      input = result;

      const environmentSchema = await getEnvironmentSchema();
      ({result, remainder} = matchExpression(remainder, environmentSchema));
      if (!isEmpty(result)) {
        extractedEnvironment = result;
      }
      input = {...input, ...remainder};
    }

    let normalizedInput = this.$getInput();

    if (normalizedInput !== undefined) {
      try {
        normalizedInput = await normalizedInput.$extend(input, {parse: inputIsParsedExpression});
      } catch (err) {
        if (err.code === 'RUN_CORE_CHILD_CREATION_DENIED') {
          throw new Error(`Cannot match input attribute (key: ${formatCode(err.childKey)})`);
        }
        throw err;
      }

      this._validateInput(normalizedInput);
    }

    let normalizedEnvironment = await getEnvironment();

    if (normalizedEnvironment.$isAncestorOf(environment)) {
      normalizedEnvironment = await environment.$extend();
    } else if (environment === undefined || isPlainObject(environment)) {
      normalizedEnvironment = await normalizedEnvironment.$extend(environment);
    } else {
      throw new TypeError(`Resource method environment is invalid`);
    }

    if (extractedEnvironment) {
      normalizedEnvironment = await normalizedEnvironment.$extend(extractedEnvironment, {
        parse: true
      });
    }

    return {normalizedInput, normalizedEnvironment};
  }

  _getInputSchema() {
    const schema = [];

    const input = this.$getInput();
    if (input === undefined) {
      return schema;
    }

    for (const child of input.$getChildren()) {
      schema.push({
        key: child.$getKey(),
        aliases: child.$aliases,
        position: child.$position,
        isVariadic: child.$isVariadic,
        isSubArguments: child.$isSubInput
      });
    }

    return schema;
  }

  _validateInput(input) {
    input.$forEachChild(child => {
      if (child.$isOptional) {
        return;
      }
      if (child instanceof Value && child.$value === undefined) {
        throw new Error(`${formatCode(child.$getKey())} input attribute is missing`);
      }
    });
  }

  async _normalizeOutput(output) {
    let normalizedOutput = this.$getOutput();
    if (normalizedOutput === undefined) {
      return undefined;
    }

    if (output instanceof Resource) {
      // TODO: Check output compatibility
      return output;
    }

    // if (output !== undefined && !isPlainObject(output)) {
    //   throw new TypeError(`Resource method output is invalid`);
    // }

    try {
      normalizedOutput = await normalizedOutput.$extend(output);
    } catch (err) {
      if (err.code === 'RUN_CORE_CHILD_CREATION_DENIED') {
        throw new Error(`Cannot match output attribute (key: ${formatCode(err.childKey)})`);
      }
      throw err;
    }

    this._validateOutput(normalizedOutput);

    return normalizedOutput;
  }

  _validateOutput(output) {
    output.$forEachChild(child => {
      if (child.$isOptional) {
        return;
      }
      if (child instanceof Value && child.$value !== undefined) {
        return;
      }
      throw new Error(`${formatCode(child.$getKey())} output attribute is missing`);
    });
  }

  _getImplementation(parent) {
    const expression = this.$runExpression;
    if (expression) {
      const methodResource = this;
      return function (input) {
        return methodResource._run(expression, input, {parent: this});
      };
    }

    if (this.$getIsNative()) {
      return parent[this.$getKey()];
    }

    let implementation;
    parent.$forSelfAndEachBase(
      resource => {
        const proto = resource.constructor.prototype;
        implementation = proto[this.$getKey()];
        if (implementation) {
          return false;
        }
      },
      {deepSearch: true}
    );
    return implementation;
  }

  async _run(expressionProperty, input, {parent} = {}) {
    let result;

    for (const expression of expressionProperty) {
      const parsedExpression = parseExpression(expression);
      result = await this._runParsedExpression(parsedExpression, {parent});
    }

    return result;
  }

  async _runParsedExpression(expression, {parent}) {
    const firstArgument = getPositionalArgument(expression, 0);
    if (
      firstArgument !== undefined &&
      (firstArgument.startsWith('.') || firstArgument.includes('/') || isAbsolute(firstArgument))
    ) {
      // The fist arguments looks like a resource identifier
      parent = await Resource.$load(firstArgument, {
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
      expression = {...expression};
      shiftPositionalArguments(expression);
    }
    return await parent.$invoke(expression);
  }

  async $invoke(expression, {parent} = {}) {
    const fn = this.$getFunction();
    return await fn.call(parent, expression);
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    const input = this._input;
    if (input !== undefined) {
      definition['@input'] = input.$serialize();
    }

    const output = this._output;
    if (output !== undefined) {
      definition['@output'] = output.$serialize();
    }

    const runExpression = this._runExpression;
    if (runExpression !== undefined) {
      if (runExpression.length === 1) {
        definition['@run'] = runExpression[0];
      } else if (runExpression.length > 1) {
        definition['@run'] = runExpression;
      }
    }

    const beforeExpression = this._beforeExpression;
    if (beforeExpression !== undefined) {
      if (beforeExpression.length === 1) {
        definition['@before'] = beforeExpression[0];
      } else if (beforeExpression.length > 1) {
        definition['@before'] = beforeExpression;
      }
    }

    const afterExpression = this._afterExpression;
    if (afterExpression !== undefined) {
      if (afterExpression.length === 1) {
        definition['@after'] = afterExpression[0];
      } else if (afterExpression.length > 1) {
        definition['@after'] = afterExpression;
      }
    }

    let listenedEvents = this._listenedEvents;
    if (listenedEvents && listenedEvents.length) {
      if (listenedEvents.length === 1) {
        listenedEvents = listenedEvents[0];
      }
      definition['@listen'] = listenedEvents;
    }

    let unlistenedEvents = this._unlistenedEvents;
    if (unlistenedEvents && unlistenedEvents.length) {
      if (unlistenedEvents.length === 1) {
        unlistenedEvents = unlistenedEvents[0];
      }
      definition['@unlisten'] = unlistenedEvents;
    }

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

let _environment;
async function getEnvironment() {
  if (!_environment) {
    _environment = await Resource.$create({'@type': 'environment'});
  }
  return _environment;
}

let _environmentSchema;
async function getEnvironmentSchema() {
  if (!_environmentSchema) {
    _environmentSchema = [];
    const environment = await getEnvironment();
    for (const child of environment.$getChildren({includeNativeChildren: true})) {
      if (!(child instanceof Value)) {
        // Ignore native methods and getters
        continue;
      }
      _environmentSchema.push({key: child.$getKey(), aliases: child.$aliases});
    }
  }
  return _environmentSchema;
}

export default MethodResource;
