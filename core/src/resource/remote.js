import {buildJSONRPCRequest, validateJSONRPCResponse} from '@resdir/json-rpc';
import postJSON from '@resdir/http-post-json';
import {createClientError, createRemoteError} from '@resdir/error';

const GET_METHODS_METHOD_VERSION = 1;
const INVOKE_METHOD_VERSION = 1;

export class RemoteResource {
  static $import(specifier) {
    if (!specifier) {
      throw createClientError(`'specifier' argument is missing`);
    }

    if (typeof specifier !== 'string') {
      throw createClientError(`'specifier' argument must be a string`);
    }

    if (!specifier.match(/^https?:\/\//i)) {
      throw createClientError(`Sorry, only HTTP(S) specifiers are supported`);
    }

    const endpoint = specifier;

    if (typeof Proxy === 'function' && typeof Proxy.revocable === 'function') {
      return createResourceProxy(endpoint);
    }

    return createResource(endpoint);
  }
}

async function createResource(endpoint) {
  const methods = await callRemoteResource({
    endpoint,
    method: 'getMethods',
    params: {version: GET_METHODS_METHOD_VERSION}
  });

  const resource = {};

  for (const name of methods) {
    resource[name] = createMethod(endpoint, name);
  }

  return resource;
}

function createResourceProxy(endpoint) {
  const resource = new Proxy(
    {},
    {
      get(target, name) {
        if (name === 'then') {
          return undefined;
        }

        if (name === '_$isRemote') {
          return true;
        }

        if (!target[name]) {
          target[name] = createMethod(endpoint, name);
        }
        return target[name];
      }
    }
  );

  return Promise.resolve(resource);
}

function createMethod(endpoint, name) {
  return async function (input, environment) {
    const {output} = await callRemoteResource({
      endpoint,
      method: 'invoke',
      params: {name, input, environment, version: INVOKE_METHOD_VERSION}
    });
    return output;
  };
}

async function callRemoteResource({endpoint, method, params, timeout}) {
  const id = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1)) + 1;

  const request = buildJSONRPCRequest(id, method, params);

  const response = await postJSON(endpoint, request, {timeout});

  if (response.jsonrpc) {
    validateJSONRPCResponse(response);

    if (response.id !== id) {
      throw new Error(`Request 'id' and response 'id' do not match while invoking a remote method`);
    }

    if (response.error) {
      throw createRemoteError(response.error.message, response.error.data);
    }

    return response.result;
  }

  if (response.errorMessage) {
    // Lambda error
    throw createRemoteError(response.errorMessage);
  }

  throw new Error(`An unknown error occurred while invoking a remote method`);
}

export default RemoteResource;
