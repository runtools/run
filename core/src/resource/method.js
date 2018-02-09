import {isEmpty, isPlainObject, difference} from 'lodash';
import {takeProperty} from '@resdir/util';
import {catchContext, formatCode} from '@resdir/console';
import {parseExpression, isParsedExpression, matchExpression} from '@resdir/expression';
import {createClientError} from '@resdir/error';

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
    return this._$getInheritedValue('_$input');
  }

  async $setInput(input) {
    if (input === undefined) {
      this._$input = undefined;
      return;
    }
    if (!isPlainObject(input)) {
      throw createClientError(`${formatCode('@input')} property must be an object`);
    }
    input = await this.constructor.$create(input);
    input.$setIsOpenByDefault(false);
    this._$input = input;
  }

  $getOutput() {
    return this._$getInheritedValue('_$output');
  }

  async $setOutput(output) {
    if (output === undefined) {
      this._$output = undefined;
      return;
    }
    if (!isPlainObject(output)) {
      throw createClientError(`${formatCode('@output')} property must be an object`);
    }
    output = await this.constructor.$create(output);
    output.$setIsOpenByDefault(false);
    this._$output = output;
  }

  get $runExpression() {
    return this._$getInheritedValue('_$runExpression');
  }

  set $runExpression(runExpression) {
    if (typeof runExpression === 'string') {
      runExpression = [runExpression];
    }
    this._$runExpression = runExpression;
  }

  get $beforeExpression() {
    return this._$beforeExpression;
  }

  set $beforeExpression(beforeExpression) {
    if (typeof beforeExpression === 'string') {
      beforeExpression = [beforeExpression];
    }
    this._$beforeExpression = beforeExpression;
  }

  $getAllBeforeExpressions() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._$beforeExpression) {
          expression.unshift(...method._$beforeExpression);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  get $afterExpression() {
    return this._$afterExpression;
  }

  set $afterExpression(afterExpression) {
    if (typeof afterExpression === 'string') {
      afterExpression = [afterExpression];
    }
    this._$afterExpression = afterExpression;
  }

  $getAllAfterExpressions() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._$afterExpression) {
          expression.push(...method._$afterExpression);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  get $listenedEvents() {
    return this._$listenedEvents;
  }

  set $listenedEvents(events) {
    if (!Array.isArray(events)) {
      events = [events];
    }
    this._$listenedEvents = events;
  }

  get $unlistenedEvents() {
    return this._$unlistenedEvents;
  }

  set $unlistenedEvents(events) {
    if (!Array.isArray(events)) {
      events = [events];
    }
    this._$unlistenedEvents = events;
  }

  $getAllListenedEvents() {
    const listenedEvents = [];
    const unlistenedEvents = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._$listenedEvents) {
          for (const event of method._$listenedEvents) {
            if (!listenedEvents.includes(event)) {
              listenedEvents.push(event);
            }
          }
        }
        if (method._$unlistenedEvents) {
          for (const event of method._$unlistenedEvents) {
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
        throw createClientError(`A resource method must be invoked with a maximum of two arguments (${formatCode('input')} and ${formatCode('environment')})`);
      }

      const {
        normalizedInput,
        normalizedEnvironment
      } = await methodResource._$normalizeInputAndEnvironment(input, environment);

      const implementation = methodResource._$getImplementation(this);
      if (!implementation) {
        throw createClientError(`Can't find implementation for ${formatCode(methodResource.$getKey())}`);
      }

      if (!(this._$hasBeenInitialized || this._$isInitializing)) {
        this._$isInitializing = true;
        await this.$emit('@initialize');
        this._$isInitializing = false;
        this._$hasBeenInitialized = true;
      }

      const beforeExpression = methodResource.$getAllBeforeExpressions();
      if (beforeExpression.length) {
        await methodResource._$run(beforeExpression, normalizedInput, {parent: this});
      }

      const output = await implementation.call(this, normalizedInput, normalizedEnvironment);

      let normalizedOutput = await methodResource._$normalizeOutput(output);

      if (normalizedOutput !== undefined && autoUnbox) {
        normalizedOutput = normalizedOutput.$autoUnbox();
      }

      const afterExpression = methodResource.$getAllAfterExpressions();
      if (afterExpression.length) {
        await methodResource._$run(afterExpression, normalizedInput, {parent: this});
      }

      return normalizedOutput;
    };
  }

  async _$normalizeInputAndEnvironment(input, environment) {
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

      const inputSchema = this._$getInputSchema();
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
          throw createClientError(`Cannot match input attribute (key: ${formatCode(err.childKey)})`);
        }
        throw err;
      }

      this._$validateInput(normalizedInput);
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

  _$getInputSchema() {
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

  _$validateInput(input) {
    input.$forEachChild(child => {
      if (child.$isOptional) {
        return;
      }
      if (child instanceof Value && child.$value === undefined) {
        throw createClientError(`${formatCode(child.$getKey())} input attribute is missing`);
      }
    });
  }

  async _$normalizeOutput(output) {
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
        throw createClientError(`Cannot match output attribute (key: ${formatCode(err.childKey)})`);
      }
      throw err;
    }

    this._$validateOutput(normalizedOutput);

    return normalizedOutput;
  }

  _$validateOutput(output) {
    output.$forEachChild(child => {
      if (child.$isOptional) {
        return;
      }
      if (child instanceof Value && child.$value !== undefined) {
        return;
      }
      throw createClientError(`${formatCode(child.$getKey())} output attribute is missing`);
    });
  }

  _$getImplementation(parent) {
    const expression = this.$runExpression;
    if (expression) {
      const methodResource = this;
      return function (input) {
        return methodResource._$run(expression, input, {parent: this});
      };
    }

    const key = this.$getKey();

    if (this.$getIsNative()) {
      return parent[key];
    }

    // TODO: Don't access private inherited properties
    const resourceImplementation = parent._$implementation;

    if (!resourceImplementation) {
      return undefined;
    }

    if (resourceImplementation._$buildError) {
      throw resourceImplementation._$buildError;
    }

    return resourceImplementation[key];
  }

  async _$run(expressionProperty, input, {parent} = {}) {
    let result;

    for (const expression of expressionProperty) {
      const parsedExpression = parseExpression(expression);
      result = await parent.$invoke(parsedExpression);
    }

    return result;
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

    const input = this._$input;
    if (input !== undefined) {
      definition['@input'] = input.$serialize();
    }

    const output = this._$output;
    if (output !== undefined) {
      definition['@output'] = output.$serialize();
    }

    const runExpression = this._$runExpression;
    if (runExpression !== undefined) {
      if (runExpression.length === 1) {
        definition['@run'] = runExpression[0];
      } else if (runExpression.length > 1) {
        definition['@run'] = runExpression;
      }
    }

    const beforeExpression = this._$beforeExpression;
    if (beforeExpression !== undefined) {
      if (beforeExpression.length === 1) {
        definition['@before'] = beforeExpression[0];
      } else if (beforeExpression.length > 1) {
        definition['@before'] = beforeExpression;
      }
    }

    const afterExpression = this._$afterExpression;
    if (afterExpression !== undefined) {
      if (afterExpression.length === 1) {
        definition['@after'] = afterExpression[0];
      } else if (afterExpression.length > 1) {
        definition['@after'] = afterExpression;
      }
    }

    let listenedEvents = this._$listenedEvents;
    if (listenedEvents && listenedEvents.length) {
      if (listenedEvents.length === 1) {
        listenedEvents = listenedEvents[0];
      }
      definition['@listen'] = listenedEvents;
    }

    let unlistenedEvents = this._$unlistenedEvents;
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
