import {buildJSONRPCRequest, validateJSONRPCResponse} from '@resdir/json-rpc';
import postJSON from '@resdir/http-post-json';
import {createClientError} from '@resdir/error';

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

    const resource = new Proxy(
      {},
      {
        get(target, name) {
          if (name === 'then') {
            return undefined;
          }

          if (!target[name]) {
            target[name] = async (input, environment) => {
              const {output} = await invoke({
                endpoint,
                method: 'invoke',
                params: {name, input, environment, version: INVOKE_METHOD_VERSION}
              });
              return output;
            };
          }
          return target[name];
        }
      }
    );

    return Promise.resolve(resource);
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
