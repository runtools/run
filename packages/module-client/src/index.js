'use strict';

import fetch from 'isomorphic-fetch';
import rpc from 'easy-json-rpc';
import getGlobal from 'system.global';

export class ModuleClient {
  static import(url) {
    if (!url) {
      throw new Error('\'url\' attribute is required to instantiate a ModuleClient');
    }

    const global = getGlobal();
    let namespace = global.__VoilaModuleClient__;
    if (!namespace) {
      global.__VoilaModuleClient__ = namespace = {};
    }
    let importedModules = namespace.importedModules;
    if (!importedModules) {
      namespace.importedModules = importedModules = {};
    }

    if (importedModules.hasOwnProperty(url)) return importedModules[url];

    const promise = invokeAt(url, '__getModuleProperties__').then(properties => {
      return new (this)({ url, properties });
    });

    importedModules[url] = promise;

    return promise;
  }

  constructor({ url, properties}) {
    this._url = url;

    for (const property of properties || []) {
      this.defineProperty(property);
    }
  }

  defineProperty({ name, type, value }) {
    if (type === 'function') {
      value = this.invoke.bind(this, name);
    }
    this[name] = value;
  }

  invoke(functionName, ...args) {
    return invokeAt(this._url, functionName, ...args);
  }
}

function invokeAt(url, functionName, ...args) {
  let request = rpc.createRequestBuilder(functionName)(...args);
  request = JSON.stringify(request);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: request
  }).then(function(response) {
    if (response.status !== 200) {
      const message = `Unexpected HTTP response (status: ${response.status})`;
      throw new Error(message);
    }
    return response.json();
  }).then(function(response) {
    if (response.jsonrpc) { // Voilà Module response
      return rpc.handleResponse(response);
    } else if (response.errorMessage) { // Lambda error
      throw new Error(response.errorMessage);
    } else {
      throw new Error('An unknown error occurred while calling a remote function');
    }
  });
}

export default ModuleClient;
