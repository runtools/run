import {isPlainObject} from 'lodash';
import {formatCode} from 'run-common';

import MethodResource from './method';
import OptionsMixin from './options-mixin';

export class CommandResource extends OptionsMixin(MethodResource) {
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

    let options = [];
    let resource = this;
    while (resource) {
      if (resource.$options) {
        options = [...options, ...resource.$options];
      }
      resource = resource.$getOwner();
    }

    for (const option of options) {
      const {key, value} = option.$match(remainingOptions) || {};
      if (key !== undefined) {
        delete remainingOptions[key];
      }
      const normalizedValue = option.$create(value, {parse}).$unwrap();
      if (normalizedValue !== undefined) {
        normalizedOptions[option.$name] = normalizedValue;
      }
    }

    const remainingOptionNames = Object.keys(remainingOptions);
    if (remainingOptionNames.length) {
      throw new Error(`Invalid command option: ${formatCode(remainingOptionNames[0])}.`);
    }

    normalizedArguments.push(normalizedOptions);

    return {normalizedArguments, remainingArguments};
  }

  _shiftLastArguments(args) {
    // Get arguments before options
    const lastArguments = [];
    while (args.length) {
      if (isPlainObject(args[0])) break;
      lastArguments.push(args.shift());
    }
    return lastArguments;
  }

  async $invoke(expression, {owner}) {
    const fn = this.$getFunction({parseArguments: true});
    const args = [...expression.arguments, expression.options];
    return await fn.apply(owner, args);
  }
}

export default CommandResource;
