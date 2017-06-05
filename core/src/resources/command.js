import {entries, isEmpty, isPlainObject} from 'lodash';
import {getProperty, addContextToErrors, formatCode} from 'run-common';

import {createResource} from './';
import MethodResource from './method';

export class CommandResource extends MethodResource {
  constructor(definition, options) {
    super(definition, options);
    this.$addInitializer(
      addContextToErrors(async () => {
        const options = getProperty(definition, '$options', ['$option']);
        if (options !== undefined) {
          await this.$setOptions(options);
        }
      }).call(this)
    );
  }

  $getOptions() {
    return this._getProperty('_options');
  }

  async $setOptions(options: ?Object) {
    this._options = undefined;
    if (options === undefined) return;
    for (let [name, option] of entries(options)) {
      option = await createResource(option, {name, directory: this.$getDirectory()});
      if (this._options === undefined) {
        this._options = [];
      }
      this._options.push(option);
    }
  }

  _normalizeArguments(args, {parse}) {
    const {normalizedArguments, remainingArguments} = super._normalizeArguments(args, {parse});

    const normalizedOptions = {};

    let optionsArgument = remainingArguments.shift();
    if (optionsArgument === undefined) {
      optionsArgument = {};
    } else if (!isPlainObject(optionsArgument)) {
      throw new Error(
        `Invalid argument type. The ${formatCode('options')} argument should be a plain Object.`
      );
    }

    const remainingOptions = {...optionsArgument};
    const options = this.$getOptions() || [];
    for (const option of options) {
      const name = option.$name;
      const value = remainingOptions[name];
      delete remainingOptions[name];
      const normalizedValue = option.$instantiate(value, {parse}).$get();
      if (normalizedValue !== undefined) {
        normalizedOptions[name] = normalizedValue;
      }
    }

    const remainingOptionNames = Object.keys(remainingOptions);
    if (remainingOptionNames.length) {
      throw new Error(`Undefined command option: ${formatCode(remainingOptionNames[0])}.`);
    }

    normalizedArguments.push(normalizedOptions);

    return {normalizedArguments, remainingArguments};
  }

  async $invoke(expression, {owner}) {
    const fn = this.$getFunction({parseArguments: true});
    const args = [...expression.arguments, expression.options];
    return await fn.apply(owner, args);
  }

  $serialize(opts) {
    let result = super.$serialize(opts);

    if (result === undefined) {
      result = {};
    }

    const options = this._options;
    if (options) {
      const serializedOptions = {};
      let count = 0;
      for (const option of options) {
        const serializedOption = option.$serialize({omitName: true});
        if (serializedOption !== undefined) {
          serializedOptions[option.$name] = serializedOption;
          count++;
        }
      }
      if (count === 1) {
        result.$option = serializedOptions;
      } else if (count > 1) {
        result.$options = serializedOptions;
      }
    }

    if (isEmpty(result)) {
      result = undefined;
    }

    return result;
  }
}

export default CommandResource;
