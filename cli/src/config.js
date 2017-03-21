import {entries, camelCase} from 'lodash';
import {expand} from 'objnest';
import {readFile, throwUserError} from 'run-common';

export const Config = {
  async load(file) {
    let config = readFile(file, {parse: true});
    config = this.normalize(config, {file});
    return config;
  },

  normalize(config, context) {
    if (!(config !== null && typeof config === 'object')) {
      throwUserError(`Configuration must be an object`, {context});
    }

    const expandedConfig = expand(config);

    const normalizedConfig = {};
    for (let [key, value] of entries(expandedConfig)) {
      if (!key.startsWith('_')) {
        key = camelCase(key);
      }
      if (value !== null && typeof value === 'object') {
        value = this.normalize(value);
      }
      normalizedConfig[key] = value;
    }

    return normalizedConfig;
  }
};

export default Config;
