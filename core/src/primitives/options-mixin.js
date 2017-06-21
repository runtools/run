import {entries, isEmpty} from 'lodash';
import {setProperty, addContextToErrors} from 'run-common';

import Resource from '../resource';

export const OptionsMixin = base =>
  class OptionsMixin extends base {
    constructor(definition, options) {
      super(definition, options);
      addContextToErrors(() => {
        setProperty(this, definition, '$options', ['$option']);
      }).call(this);
    }

    get $options() {
      return this._getProperty('_options');
    }

    set $options(options) {
      this._options = undefined;
      if (options === undefined) return;
      for (let [name, option] of entries(options)) {
        option = Resource.$create(option, {name, directory: this.$getDirectory()});
        if (this._options === undefined) {
          this._options = [];
        }
        this._options.push(option);
      }
    }

    $serialize(opts) {
      let definition = super.$serialize(opts);

      if (definition === undefined) {
        definition = {};
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
          definition.$option = serializedOptions;
        } else if (count > 1) {
          definition.$options = serializedOptions;
        }
      }

      if (isEmpty(definition)) {
        definition = undefined;
      }

      return definition;
    }
  };

export default OptionsMixin;
