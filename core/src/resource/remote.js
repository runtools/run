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

    const methods = await invoke({
      endpoint,
      method: 'getMethods',
      timeout: 30 * 1000
    });

    const resource = {};

    for (const name of methods) {
      resource[name] = async (input, environment) => {
        const {output} = await invoke({
          endpoint,
          method: 'invokeMethod',
          params: {name, input, environment}
        });
        return output;
      };
    }

    return resource;
  }
}

async function invoke({endpoint, method, params, timeout}) {
  const id = Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1)) + 1;

  const request = buildJSONRPCRequest(id, method, params);

  const response = await postJSON(endpoint, request, {timeout});

  if (response.jsonrpc) {
    validateJSONRPCResponse(response);

    if (response.id !== id) {
      throw new Error(`Request 'id' and response 'id' do not match while invoking a remote method`);
    }

    if (response.error) {
      const err = new Error(response.error.message);
      err.jsonRPCErrorCode = response.error.code;
      Object.assign(err, response.error.data);
      throw err;
    }

    return response.result;
  }

  if (response.errorMessage) {
    // Lambda error
    throw new Error(response.errorMessage);
  }

  throw new Error(`An unknown error occurred while invoking a remote method`);
}

export default RemoteResource;
