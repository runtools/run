import {buildJSONRPCRequest, validateJSONRPCResponse} from '@resdir/json-rpc';
import postJSON from '@resdir/http-post-json';

export class RemoteResource {
  static async $import(specifier) {
    if (!specifier) {
      throw new Error(`'specifier' argument is missing`);
    }

    if (typeof specifier !== 'string') {
      throw new Error(`'specifier' argument must be a string`);
    }

    if (!specifier.match(/^https?:\/\//i)) {
      throw new Error(`Sorry, only HTTP(S) specifiers are supported`);
    }

    const endpoint = specifier;

    const methods = await invokeRemoteMethod({
      endpoint,
      name: '__getMethods__',
      timeout: 30 * 1000
    });

    const resource = {};

    for (const name of methods) {
      resource[name] = (input, environment) => {
        return invokeRemoteMethod({endpoint, name, input, environment});
      };
    }

    return resource;
  }
}

async function invokeRemoteMethod({endpoint, name, input, environment, timeout}) {
  const id = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1)) + 1;

  const request = buildJSONRPCRequest(id, name, {input, environment});

  const response = await postJSON(endpoint, request, {timeout});

  if (response.jsonrpc) {
    validateJSONRPCResponse(response);

    if (response.id !== id) {
      throw new Error(
        `Request 'id' and response 'id' do not match while invoking a remote method (name: '${name}')`
      );
    }

    if (response.error) {
      const err = new Error(response.error.message);
      err.code = response.error.code;
      Object.assign(err, response.error.data);
      throw err;
    }

    return response.result;
  }

  if (response.errorMessage) {
    // Lambda error
    throw new Error(response.errorMessage);
  }

  throw new Error(`An unknown error occurred while invoking a remote method (name: '${name}')`);
}

export default RemoteResource;
