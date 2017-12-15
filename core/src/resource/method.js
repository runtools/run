import {isAbsolute} from 'path';
import {isEmpty, isPlainObject, difference} from 'lodash';
import {takeProperty, getPropertyKeyAndValue} from '@resdir/util';
import {catchContext, formatString, formatCode} from '@resdir/console';
import {
  makePositionalArgumentKey,
  getPositionalArgument,
  shiftPositionalArguments,
  setSubArguments,
  getSubArgumentsKey
} from '@resdir/method-arguments';
import {parse} from 'shell-quote';

import Resource from '../resource';
import EnvironmentResource from './environment';
import Value from './value';

export class MethodResource extends Resource {
  static $RESOURCE_TYPE = 'method';

  async $construct(definition, options) {
    definition = {...definition};

    const input = takeProperty(definition, '@input');
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
    this._input = undefined;
    if (input === undefined) {
      return;
    }
    if (!isPlainObject(input)) {
      throw new Error(`${formatCode('@input')} property must be an object`);
    }
    this._input = await Resource.$create(input, {
      directory: this.$getCurrentDirectory({throwIfUndefined: false})
    });
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
    return this.$getFunction();
  }

  $getFunction({parseArguments} = {}) {
    const methodResource = this;

    return async function (input, environment, ...rest) {
      const {normalizedInput, extractedEnvironment} = await methodResource._normalizeInput(input, {
        parse: parseArguments
      });

      let normalizedEnvironment = await methodResource._normalizeEnvironement(environment);
      if (extractedEnvironment) {
        normalizedEnvironment = await normalizedEnvironment.$extend(extractedEnvironment, {
          parse: parseArguments
        });
      }

      if (rest.length !== 0) {
        throw new TypeError(`A resource method must be invoked with a maximum of two arguments (${formatCode('input')} and ${formatCode('environment')})`);
      }

      const implementation = methodResource._getImplementation(this);
      if (!implementation) {
        throw new Error(`Can't find implementation for ${formatCode(methodResource.$getKey())}`);
      }

      const beforeExpression = methodResource.$getAllBeforeExpressions();
      if (beforeExpression.length) {
        await methodResource._run(beforeExpression, normalizedInput, {parent: this});
      }

      const result = await implementation.call(this, normalizedInput, normalizedEnvironment);

      const afterExpression = methodResource.$getAllAfterExpressions();
      if (afterExpression.length) {
        await methodResource._run(afterExpression, normalizedInput, {parent: this});
      }

      return result;
    };
  }

  async _normalizeInput(input = {}, {parse}) {
    if (input instanceof Resource) {
      return {normalizedInput: input};
    }

    if (!isPlainObject(input)) {
      throw new TypeError(`A resource method must be invoked with an 'input' argument of type Resource, plain object or undefined (${formatString(typeof input)} received)`);
    }

    input = {...input};

    let normalizedInput = this.$getInput();
    if (normalizedInput !== undefined) {
      normalizedInput = await normalizedInput.$extend();
    } else {
      normalizedInput = await Resource.$create(input, {
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
    }

    for (const child of normalizedInput.$getChildren()) {
      const {key, value} = findArgument(input, child);
      if (key !== undefined) {
        delete input[key];
        if (value !== undefined) {
          await normalizedInput.$setChild(child.$getKey(), value, {parse});
        }
      }
    }

    let extractedEnvironment;

    if (parse) {
      const environmentChildren = (await getEnvironment()).$getChildren({
        includeNativeChildren: true
      });
      for (const child of environmentChildren) {
        if (!(child instanceof Value)) {
          // Ignore native methods and getters
          continue;
        }
        const {key, value} = findArgument(input, child);
        if (key === undefined) {
          continue;
        }
        delete input[key];
        if (value === undefined) {
          continue;
        }
        if (extractedEnvironment === undefined) {
          extractedEnvironment = {};
        }
        extractedEnvironment[child.$getKey()] = value;
      }
    }

    const remainingKeys = Object.keys(input);
    if (remainingKeys.length) {
      throw new Error(`Invalid method input key: ${formatCode(remainingKeys[0])}.`);
    }

    return {normalizedInput, extractedEnvironment};
  }

  async _normalizeEnvironement(environment) {
    if (environment instanceof Resource) {
      return environment;
    }

    let normalizedEnvironment = await getEnvironment();

    if (environment !== undefined) {
      if (!isPlainObject(environment)) {
        throw new TypeError(`A resource method must be invoked with an 'environment' argument of type Resource, plain object or undefined (${formatString(typeof environment)} received)`);
      }
      normalizedEnvironment = await normalizedEnvironment.$extend(environment);
    }

    return normalizedEnvironment;
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
      // TODO: Replace 'shell-quote' with something more suitable

      // // Prevent 'shell-quote' from interpreting operators:
      // for (const operator of '|&;()<>') {
      //   expression = expression.replace(
      //     new RegExp('\\' + operator, 'g'),
      //     '\\' + operator
      //   );
      // }

      let parsedExpression = parse(expression, variable => {
        if (!(variable in input)) {
          throw new Error(`Invalid variable found in a method expression: ${formatCode(variable)}`);
        }
        return String(input[variable]);
      });

      parsedExpression = parsedExpression.map(arg => {
        if (typeof arg === 'string') {
          return arg;
        }
        throw new Error(`Argument parsing failed (arg: ${JSON.stringify(arg)})`);
      });

      parsedExpression = parseCommandLineArguments(parsedExpression);

      result = await this._runParsedExpression(parsedExpression, {parent});
    }

    return result;
  }

  async _runParsedExpression(args, {parent}) {
    const firstArgument = getPositionalArgument(args, 0);
    if (
      firstArgument !== undefined &&
      (firstArgument.startsWith('.') || firstArgument.includes('/') || isAbsolute(firstArgument))
    ) {
      // The fist arguments looks like a resource identifier
      parent = await Resource.$load(firstArgument, {
        directory: this.$getCurrentDirectory({throwIfUndefined: false})
      });
      args = {...args};
      shiftPositionalArguments(args);
    }
    return await parent.$invoke(args);
  }

  async $invoke(args, {parent} = {}) {
    const fn = this.$getFunction({parseArguments: true});
    return await fn.call(parent, args);
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
    _environment = await EnvironmentResource.$create();
  }
  return _environment;
}

function findArgument(args, child) {
  let {key, value} = getPropertyKeyAndValue(args, child.$getKey(), child.$aliases) || {};

  if (key === undefined) {
    const position = child.$position;
    if (position !== undefined) {
      const positionalArgumentKey = makePositionalArgumentKey(position);
      if (positionalArgumentKey in args) {
        key = positionalArgumentKey;
        value = args[key];
      }
    }
  }

  if (key === undefined) {
    if (child.$isSubInput) {
      const subArgumentsKey = getSubArgumentsKey();
      if (subArgumentsKey in args) {
        key = subArgumentsKey;
        value = args[key];
      }
    }
  }

  return {key, value};
}

function parseCommandLineArguments(argsAndOpts) {
  if (!Array.isArray(argsAndOpts)) {
    throw new TypeError('\'argsAndOpts\' must be an array');
  }

  let subArgsAndOpts;
  const index = argsAndOpts.indexOf('--');
  if (index !== -1) {
    subArgsAndOpts = argsAndOpts.slice(index + 1);
    argsAndOpts = argsAndOpts.slice(0, index);
  }

  const result = _parseCommandLineArguments(argsAndOpts);

  if (subArgsAndOpts) {
    const subResult = _parseCommandLineArguments(subArgsAndOpts);
    setSubArguments(result, subResult);
  }

  return result;
}

function _parseCommandLineArguments(argsAndOpts) {
  const result = {};

  for (let i = 0, position = 0; i < argsAndOpts.length; i++) {
    const argOrOpt = argsAndOpts[i];

    if (typeof argOrOpt === 'string' && argOrOpt.startsWith('--')) {
      let opt = argOrOpt.slice(2);
      let val;

      const index = opt.indexOf('=');
      if (index !== -1) {
        val = opt.slice(index + 1);
        opt = opt.slice(0, index);
      }

      if (val === undefined) {
        if (opt.startsWith('no-')) {
          val = 'false';
          opt = opt.slice(3);
        } else if (opt.startsWith('non-')) {
          val = 'false';
          opt = opt.slice(4);
        } else if (opt.startsWith('@no-')) {
          val = 'false';
          opt = '@' + opt.slice(4);
        } else if (opt.startsWith('@non-')) {
          val = 'false';
          opt = '@' + opt.slice(5);
        }
      }

      if (val === undefined && i + 1 < argsAndOpts.length) {
        const nextArgOrOpt = argsAndOpts[i + 1];
        if (typeof nextArgOrOpt !== 'string' || !nextArgOrOpt.startsWith('-')) {
          val = nextArgOrOpt;
          i++;
        }
      }

      if (val === undefined) {
        val = 'true';
      }

      result[opt] = val;
      continue;
    }

    if (typeof argOrOpt === 'string' && argOrOpt.startsWith('-')) {
      const opts = argOrOpt.slice(1);
      for (let i = 0; i < opts.length; i++) {
        const opt = opts[i];
        if (!/[\w\d]/.test(opt)) {
          throw new Error(`Invalid command line option: ${formatCode(argOrOpt)}`);
        }
        result[opt] = 'true';
      }
      continue;
    }

    result[makePositionalArgumentKey(position)] = argOrOpt;
    position++;
  }

  return result;
}

export default MethodResource;
