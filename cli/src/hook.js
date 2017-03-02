import pick from 'lodash.pick';

export class Hook {
  constructor(hook) {
    Object.assign(this, pick(hook, ['name', 'target']));
  }

  static normalize(hook) {
    if (!hook) {
      throw new Error("'hook' parameter is missing");
    }
    if (!hook.name) {
      throw new Error("'name' property is missing in a hook");
    }
    if (!hook.target) {
      throw new Error("'target' property is missing in a hook");
    }

    let normalizedHook = pick(hook, ['name', 'target']);
    normalizedHook = new this(hook);
    return normalizedHook;
  }

  static normalizeMany(hooks) {
    const normalizedHooks = [];

    if (!hooks) {
      hooks = {};
    }

    for (const name of Object.keys(hooks)) {
      let hook = hooks[name];
      if (typeof hook === 'string') {
        hook = {target: hook};
      }
      hook.name = name;
      const normalizedHook = this.normalize(hook);
      normalizedHooks.push(normalizedHook);
    }

    return normalizedHooks;
  }
}

export default Hook;
