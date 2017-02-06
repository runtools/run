'use strict';

import isPromise from 'is-promise';

export function createRequestBuilder(method, id = null) {
  const request = { jsonrpc: '2.0', method, id };
  validateRequest(request);
  return function(...params) {
    const req = Object.assign({}, request);
    if (params.length) req.params = params;
    return req;
  };
}

export function handleRequest(request, target) {
  validateRequest(request);
  if (target == null) {
    throw createError(-32603, '\'target\' parameter is missing');
  }

  const method = target[request.method];
  if (!method || typeof method !== 'function') {
    throw createError(-32601);
  }

  return method.apply(undefined, request.params);
}

export function buildResponse(fn, id = null) {
  if (!fn) {
    throw createError(-32603, '\'fn\' parameter is missing');
  }
  if (typeof fn !== 'function') {
    throw createError(-32603, '\'fn\' parameter must be a function');
  }

  validateIdAttribute(id);

  let result;

  try {
    result = fn();
  } catch (err) {
    return buildResponseWithError(err, id);
  }

  if (isPromise(result)) {
    return result
      .then(res => buildResponseWithResult(res, id))
      .catch(err => buildResponseWithError(err, id));
  } else {
    return buildResponseWithResult(result, id);
  }
}

export function handleRequestAndBuildResponse(request, target) {
  const id = request && request.id || null;
  return buildResponse(() => handleRequest(request, target), id);
}

export function handleResponse(response, requestId = null) {
  validateResponse(response);
  validateIdAttribute(requestId);

  const { result, error, id } = response;

  if (id !== requestId) {
    throw createError(-32603, 'Request \'id\' and response \'id\' do not match');
  }

  if (error) {
    const err = new Error(error.message);
    err.code = error.code;
    Object.assign(err, error.data);
    throw err;
  } else {
    return result;
  }
}

function buildResponseWithResult(result, id) {
  const response = { jsonrpc: '2.0', id };
  if (result !== undefined) response.result = result;
  validateResponse(response);
  return response;
}

function buildResponseWithError(err, id) {
  if (!err) throw createError(-32603, '\'err\' parameter is missing');

  const error = {
    code: err.code || 1,
    message: err.message,
    data: { name: err.name }
  };
  for (const key of Object.keys(err)) {
    if (key === 'code' || key === 'message' || key === 'name') continue;
    error.data[key] = err[key];
  }

  const response = { jsonrpc: '2.0', error, id };
  validateResponse(response);
  return response;
}

function validateRequest({ jsonrpc, method, id, params }) {
  validateJSONRPCAttribute(jsonrpc);

  if (!method) {
    throw createError(-32600, '\'method\' attribute is missing');
  }
  if (typeof method !== 'string') {
    throw createError(-32600, '\'method\' attribute must be a string');
  }

  validateIdAttribute(id);

  if (!(typeof params === 'undefined' || Array.isArray(params))) {
    throw createError(-32602, '\'params\' attribute must be an array or undefined');
  }
}

function validateResponse({ jsonrpc, result, error, id }) {
  validateJSONRPCAttribute(jsonrpc);

  if (result != null && error != null) {
    throw createError(-32603, 'A JSON-RPC response cannot have both a \'result\' and \'error\' attribute');
  }

  if (error != null) {
    if (!error.code || typeof error.code !== 'number') {
      throw createError(-32603, 'A JSON-RPC error response must have a \'code\' attribute');
    }
    if (!error.message || typeof error.message !== 'string') {
      throw createError(-32603, 'A JSON-RPC error response must have a \'message\' attribute');
    }
  }

  validateIdAttribute(id);
}

function validateJSONRPCAttribute(jsonrpc) {
  if (!jsonrpc) {
    throw createError(-32600, '\'jsonrpc\' attribute is missing');
  }
  if (jsonrpc !== '2.0') {
    throw createError(-32600, '\'jsonrpc\' attribute value must be \'2.0\'');
  }
}

function validateIdAttribute(id) {
  if (!(id === null || typeof id === 'number' || typeof id === 'string')) {
    throw createError(-32600, '\'id\' attribute must be a number, a string or null');
  }
  if (typeof id === 'string' && !id) {
    throw createError(-32600, '\'id\' attribute cannot be an empty string');
  }
}

const errors = {
  '-32700': 'Parse error',
  '-32600': 'Invalid Request',
  '-32601': 'Method not found',
  '-32602':	'Invalid params',
  '-32603': 'Internal error'
};

function createError(code, message) {
  if (!message) message = errors[String(code)];
  if (!message) return createError(-32603);
  const err = new Error(message);
  err.code = code;
  err.jsonRPCError = true;
  return err;
}

export default {
  createRequestBuilder,
  handleRequest,
  buildResponse,
  handleRequestAndBuildResponse,
  handleResponse
};
