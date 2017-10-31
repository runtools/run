import {isAbsolute} from 'path';
import {isEmpty, isPlainObject} from 'lodash';
import {getProperty} from '@resdir/util';
import {catchContext, formatString, formatCode} from '@resdir/console';
import {getPropertyKeyAndValue} from '@resdir/util';
import {parse} from 'shell-quote';

import {Resource, getCommonParameters} from '../resource';
import {
  makePositionalArgumentKey,
  getPositionalArgument,
  shiftPositionalArguments
} from '@resdir/method-arguments';

export class MethodResource extends Resource {
  async $construct(definition, options) {
    await super.$construct(definition, options);
    await catchContext(this, async () => {
      const expression = getProperty(definition, '@expression');
      if (expression !== undefined) {
        this.$expression = expression;
      }

      const before = getProperty(definition, '@before');
      if (before !== undefined) {
        this.$before = before;
      }

      const after = getProperty(definition, '@after');
      if (after !== undefined) {
        this.$after = after;
      }

      const listenedEvents = getProperty(definition, '@listen');
      if (listenedEvents !== undefined) {
        this.$setListenedEvents(listenedEvents);
      }
    });
  }

  get $expression() {
    return this._getInheritedValue('_expression');
  }

  set $expression(expression) {
    if (typeof expression === 'string') {
      expression = [expression];
    }
    this._expression = expression;
  }

  get $before() {
    return this._before;
  }

  set $before(before) {
    if (typeof before === 'string') {
      before = [before];
    }
    this._before = before;
  }

  $getAllBefore() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._before) {
          expression.unshift(...method._before);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  get $after() {
    return this._after;
  }

  set $after(after) {
    if (typeof after === 'string') {
      after = [after];
    }
    this._after = after;
  }

  $getAllAfter() {
    const expression = [];
    this.$forSelfAndEachBase(
      method => {
        if (method._after) {
          expression.push(...method._after);
        }
      },
      {deepSearch: true}
    );
    return expression;
  }

  $getListenedEvents() {
    return this._getInheritedValue('_listenedEvents');
  }

  $setListenedEvents(events) {
    if (!events) {
      throw new Error('\'events\' argument is missing');
    }

    if (!Array.isArray(events)) {
      events = [events];
    }

    const parent = this.$getParent();
    if (parent) {
      for (const event of events) {
        parent.$listenEvent(event, this);
      }
    }

    this._listenedEvents = events;
  }

  $defaultAutoUnboxing = true;

  $unbox() {
    return this.$getFunction();
  }

  $getFunction({parseArguments} = {}) {
    const methodResource = this;

    return async function (args, environment, ...rest) {
      const {
        normalizedArguments,
        environmentArguments
      } = await methodResource._normalizeArguments(args, {
        parse: parseArguments
      });

      environment = methodResource._normalizeEnvironement(environment);
      environment = {...environment, ...environmentArguments};

      if (rest.length !== 0) {
        throw new TypeError(
          `A resource method must be invoked with a maximum of two arguments (${formatCode(
            'arguments'
          )} and ${formatCode('environment')})`
        );
      }

      const implementation = methodResource._getImplementation();
      if (!implementation) {
        throw new Error(`Can't find implementation for ${formatCode(methodResource.$getKey())}`);
      }

      const before = methodResource.$getAllBefore();
      if (before.length) {
        await methodResource._runExpression(before, normalizedArguments, {parent: this});
      }

      const result = await implementation.call(this, normalizedArguments, environment);

      const after = methodResource.$getAllAfter();
      if (after.length) {
        await methodResource._runExpression(after, normalizedArguments, {parent: this});
      }

      return result;
    };
  }

  async _normalizeArguments(args, {parse}) {
    if (args === undefined) {
      args = {};
    }

    if (!isPlainObject(args)) {
      throw new TypeError(
        `A resource method must be invoked with a plain object ${formatCode(
          'arguments'
        )} argument (${formatString(typeof args)} received)`
      );
    }

    const remainingArguments = {...args};

    const normalizedArguments = {};
    for (const parameter of this.$getAllParameters()) {
      const {key, value} = await extractArgument(remainingArguments, parameter, {parse});
      if (value !== undefined) {
        normalizedArguments[key] = value;
      }
    }

    const environmentArguments = {};
    for (const parameter of await getCommonParameters()) {
      const {key, value} = await extractArgument(remainingArguments, parameter, {parse});
      if (value !== undefined) {
        environmentArguments[key.slice(1)] = value;
      }
    }

    const remainingArgumentKeys = Object.keys(remainingArguments);
    if (remainingArgumentKeys.length) {
      throw new Error(`Invalid method argument: ${formatCode(remainingArgumentKeys[0])}.`);
    }

    return {normalizedArguments, environmentArguments};
  }

  _normalizeEnvironement(environment) {
    if (environment === undefined) {
      environment = {};
    }

    if (!isPlainObject(environment)) {
      throw new TypeError(
        `A resource method must be invoked with a plain object ${formatCode(
          'environment'
        )} argument (${formatString(typeof environment)} received)`
      );
    }

    return environment;
  }

  _getImplementation() {
    const expression = this.$expression;
    if (expression) {
      const methodResource = this;
      return function (args) {
        return methodResource._runExpression(expression, args, {parent: this});
      };
    }

    let implementation;
    const parent = this.$getParent();
    if (parent) {
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
    }
    return implementation;
  }

  async _runExpression(expressionProperty, args, {parent} = {}) {
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
        if (!(variable in args)) {
          throw new Error(`Invalid variable found in a method expression: ${formatCode(variable)}`);
        }
        return String(args[variable]);
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

    const expression = this._expression;
    if (expression !== undefined) {
      if (expression.length === 1) {
        definition['@expression'] = expression[0];
      } else if (expression.length > 1) {
        definition['@expression'] = expression;
      }
    }

    const before = this._before;
    if (before !== undefined) {
      if (before.length === 1) {
        definition['@before'] = before[0];
      } else if (before.length > 1) {
        definition['@before'] = before;
      }
    }

    const after = this._after;
    if (after !== undefined) {
      if (after.length === 1) {
        definition['@after'] = after[0];
      } else if (after.length > 1) {
        definition['@after'] = after;
      }
    }

    let listenedEvents = this._listenedEvents;
    if (listenedEvents && listenedEvents.length) {
      if (listenedEvents.length === 1) {
        listenedEvents = listenedEvents[0];
      }
      definition['@listen'] = listenedEvents;
    }

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

function findArgument(args, parameter) {
  let {key, value} = getPropertyKeyAndValue(args, parameter.$getKey(), parameter.$aliases) || {};

  if (key === undefined) {
    const position = parameter.$position;
    if (position !== undefined) {
      const positionalArgumentKey = makePositionalArgumentKey(position);
      if (positionalArgumentKey in args) {
        key = positionalArgumentKey;
        value = args[key];
      }
    }
  }

  return {key, value};
}

async function extractArgument(args, parameter, {parse}) {
  const {key, value} = findArgument(args, parameter);
  if (key !== undefined) {
    delete args[key];
  }
  const normalizedValue = (await parameter.$extend(value, {parse})).$autoUnbox();
  return {key: parameter.$getKey(), value: normalizedValue};
}

function parseCommandLineArguments(argsAndOpts) {
  if (!Array.isArray(argsAndOpts)) {
    throw new TypeError('\'argsAndOpts\' must be an array');
  }

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
