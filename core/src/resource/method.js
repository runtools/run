import {isEmpty, isPlainObject} from 'lodash';
import {getProperty} from '@resdir/util';
import {catchContext, formatString, formatCode} from '@resdir/console';
import {getPropertyKeyAndValue} from '@resdir/util';

import {Resource, getCommonParameters} from '../resource';
import {makePositionalArgumentKey} from '../arguments';

export class MethodResource extends Resource {
  async $construct(definition, options) {
    await super.$construct(definition, options);
    await catchContext(this, async () => {
      const listenedEvents = getProperty(definition, '@listen');
      if (listenedEvents !== undefined) {
        this.$setListenedEvents(listenedEvents);
      }

      const emittedEvents = getProperty(definition, '@emit');
      if (emittedEvents !== undefined) {
        this.$setEmittedEvents(emittedEvents);
      }
    });
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

  $getEmittedEvents() {
    return this._getInheritedValue('_emittedEvents');
  }

  $setEmittedEvents(events) {
    if (!events) {
      throw new Error('\'events\' argument is missing');
    }

    // TODO: handle event definition such as:
    // { before: 'will-build' } (custom before event name and no after)

    if (!events.startsWith('*:')) {
      throw new Error(
        `Invalid event name: ${formatString(events)}. It should be prefixed by ${formatString(
          '*:'
        )}.`
      );
    }

    const event = events.slice(2);
    this._emittedEvents = {
      before: 'before:' + event,
      after: 'after:' + event
    };
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

      const emittedEvents = methodResource.$getEmittedEvents();

      if (emittedEvents && emittedEvents.before) {
        await this.$emitEvent(emittedEvents.before);
      }

      const result = await implementation.call(this, normalizedArguments, environment);

      if (emittedEvents && emittedEvents.after) {
        await this.$emitEvent(emittedEvents.after);
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

  async $invoke(args, {parent} = {}) {
    const fn = this.$getFunction({parseArguments: true});
    return await fn.call(parent, args);
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    let listenedEvents = this._listenedEvents;
    if (listenedEvents && listenedEvents.length) {
      if (listenedEvents.length === 1) {
        listenedEvents = listenedEvents[0];
      }
      definition['@listen'] = listenedEvents;
    }

    const emittedEvents = this._emittedEvents;
    if (emittedEvents) {
      // TODO: handle custom event definitions
      let event = emittedEvents.before;
      event = event.slice('before:'.length);
      definition['@emit'] = '*:' + event;
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

export default MethodResource;
