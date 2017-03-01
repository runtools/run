import pick from 'lodash.pick';

export class Hook {
  constructor(hook) {
    Object.assign(this, hook);
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

    const normalizedHook = pick(hook, ['name', 'target']);

    return normalizedHook;
  }
}

export default Hook;
