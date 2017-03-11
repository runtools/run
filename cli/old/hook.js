import entries from 'lodash.topairs';

import Target from './target';

export class Hook {
  constructor(normalizedHook) {
    Object.assign(this, normalizedHook);
  }

  static normalize(hook, defaultName) {
    if (!hook) {
      throw new Error("'hook' parameter is missing");
    }

    if (typeof hook === 'string') {
      hook = {targets: hook};
    }

    if (!hook.name) {
      if (defaultName) {
        hook.name = defaultName;
      } else {
        throw new Error("Hook 'name' property is missing");
      }
    }

    const normalizedHook = {
      name: hook.name,
      targets: Target.normalizeMany(hook.targets || hook.target)
    };

    return new this(normalizedHook);
  }

  static normalizeMany(hooks = []) {
    if (Array.isArray(hooks)) {
      return hooks.map(this.normalize, this);
    }
    return entries(hooks).map(([name, hook]) => this.normalize(hook, name));
  }
}

export default Hook;
