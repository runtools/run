import {isPlainObject} from 'lodash';
import {formatCode} from 'run-common';

import MethodResource from './method';

export class CommandResource extends MethodResource {
  async _normalizeArguments(args, {parse}) {
    const {normalizedArguments, remainingArguments} = await super._normalizeArguments(args, {
      parse
    });

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

    const options = [];
    let resource = this;
    while (resource) {
      const resourceOptions = resource.$getOptions && resource.$getOptions();
      if (resourceOptions) {
        for (const newOption of resourceOptions) {
          if (!options.find(option => option.$name === newOption.$name)) {
            options.push(newOption);
          }
        }
      }
      resource = resource.$getParent();
    }

    for (const option of options) {
      const {key, value} = option.$match(remainingOptions) || {};
      if (key !== undefined) {
        delete remainingOptions[key];
      }
      const normalizedValue = (await option.$extend(value, {parse})).$autoUnbox();
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
      if (isPlainObject(args[0])) {
        break;
      }
      lastArguments.push(args.shift());
    }
    return lastArguments;
  }

  async $invoke(expression = {arguments: [], options: {}}, {parent} = {}) {
    const fn = this.$getFunction({parseArguments: true});
    const args = [...expression.arguments, expression.options];
    return await fn.apply(parent, args);
  }
}

export default CommandResource;
