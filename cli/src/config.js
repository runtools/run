import {entries, camelCase} from 'lodash';
import {nest} from 'flatnest';

export const Config = {
  normalize(config: Object) {
    const nestedConfig = nest(config);

    const normalizedConfig = {};
    for (let [key, value] of entries(nestedConfig)) {
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
