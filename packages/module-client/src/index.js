'use strict';

const fetch = require('isomorphic-fetch');
const rpc = require('easy-json-rpc').default;

export class ModuleClient {
  static import(url) {
    if (!url) {
      throw new Error('\'url\' attribute is required to instantiate a ModuleClient');
    }

    return invokeAt(url, '__getModuleProperties__').then(properties => {
      return new (this)({ url, properties });
    });
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
    if (response.jsonrpc) { // Voila Module response
      return rpc.handleResponse(response);
    } else if (response.errorMessage) { // Lambda error
      throw new Error(response.errorMessage);
    } else {
      throw new Error('An unknown error occurred while calling a remote function');
    }
  });
}

export default ModuleClient;
