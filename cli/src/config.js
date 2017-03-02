export class Config {
  constructor(config) {
    Object.assign(this, config);
  }

  static normalize(config) {
    let normalizedConfig = config;
    if (!normalizedConfig) {
      normalizedConfig = {};
    }
    // TODO: more normalizations
    normalizedConfig = new this(normalizedConfig);
    return normalizedConfig;
  }

  merge(other) {
    return this; // TODO
  }
}

export default Config;
