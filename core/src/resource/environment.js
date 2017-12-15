import {isEmpty} from 'lodash';
import {takeProperty} from '@resdir/util';
import {catchContext} from '@resdir/console';

import Resource from '../resource';
import Boolean from './boolean';

export class EnvironmentResource extends Resource {
  static $RESOURCE_NATIVE_CHILDREN = {
    '@verbose': {
      '@type': 'boolean',
      '@aliases': ['@v']
    },
    '@quiet': {
      '@type': 'boolean',
      '@aliases': ['@q']
    },
    '@debug': {
      '@type': 'boolean',
      '@aliases': ['@d']
    }
  };

  async $construct(definition, options) {
    definition = {...definition};

    const verbose = takeProperty(definition, '@verbose', ['@v']);
    const quiet = takeProperty(definition, '@quiet', ['@q']);
    const debug = takeProperty(definition, '@debug', ['@d']);

    await super.$construct(definition, options);

    catchContext(this, () => {
      const parse = options && options.parse;
      if (verbose !== undefined) {
        this.$setVerbose(verbose, {parse});
      }
      if (quiet !== undefined) {
        this.$setQuiet(quiet, {parse});
      }
      if (debug !== undefined) {
        this.$setDebug(debug, {parse});
      }
    });
  }

  $getVerbose() {
    return this._getInheritedValue('_verbose');
  }

  $setVerbose(verbose, options) {
    this._verbose = normalizeBoolean(verbose, options);
  }

  get '@verbose'() {
    return this.$getVerbose();
  }

  $getQuiet() {
    return this._getInheritedValue('_quiet');
  }

  $setQuiet(quiet, options) {
    this._quiet = normalizeBoolean(quiet, options);
  }

  get '@quiet'() {
    return this.$getQuiet();
  }

  $getDebug() {
    return this._getInheritedValue('_debug');
  }

  $setDebug(debug, options) {
    this._debug = normalizeBoolean(debug, options);
  }

  get '@debug'() {
    return this.$getDebug();
  }

  $serialize(options) {
    let definition = super.$serialize(options);

    if (definition === undefined) {
      definition = {};
    }

    if (this._verbose !== undefined) {
      definition['@verbose'] = this._verbose;
    }

    if (this._quiet !== undefined) {
      definition['@quiet'] = this._quiet;
    }

    if (this._debug !== undefined) {
      definition['@debug'] = this._debug;
    }

    if (isEmpty(definition)) {
      definition = undefined;
    }

    return definition;
  }
}

function normalizeBoolean(boolean, options) {
  if (boolean === undefined || typeof boolean === 'boolean') {
    return boolean;
  }
  if (typeof boolean === 'string' && options && options.parse) {
    return Boolean.$parse(boolean);
  }
  throw new TypeError(`Attribute value type must be a boolean`);
}

export default EnvironmentResource;
