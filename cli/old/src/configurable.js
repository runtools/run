import {avoidCommonMistakes, addContextToErrors} from 'run-common';

import Option from './option';

export function ConfigurableMixin(superclass) {
  return class extends superclass {
    constructor(definition = {}) {
      super(definition);
      addContextToErrors(() => {
        avoidCommonMistakes(definition, {
          option: 'options'
        });
        this.options = definition.options;
      }).call(this);
    }

    _options = [];

    get options() {
      return this._options.length ? this._options : undefined;
    }

    set options(options: ?(Array | Object | string)) {
      this._options = Option.createMany(options);
    }

    toJSON() {
      return {...(super.toJSON && super.toJSON()), options: this.options};
    }

    getDefaultConfig() {
      const config = {};
      for (const option of this.options) {
        config[option.name] = option.default;
      }
      return config;
    }
  };
}

export default ConfigurableMixin;
