'use strict';

function unwrapExports (x) {
	return x && x.__esModule ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var index$4 = isPromise;

function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

var index$2 = createCommonjsModule(function (module, exports) {
'use strict';

exports.__esModule = true;
exports.createRequestBuilder = createRequestBuilder;
exports.handleRequest = handleRequest;
exports.buildResponse = buildResponse;
exports.handleRequestAndBuildResponse = handleRequestAndBuildResponse;
exports.handleResponse = handleResponse;

var _isPromise = index$4;

var _isPromise2 = _interopRequireDefault(_isPromise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createRequestBuilder(method) {
  var id = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  var request = { jsonrpc: '2.0', method: method, id: id };
  validateRequest(request);
  return function () {
    var req = Object.assign({}, request);

    for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
      params[_key] = arguments[_key];
    }

    if (params.length) req.params = params;
    return req;
  };
}

function handleRequest(request, target) {
  validateRequest(request);
  if (target == null) {
    throw createError(-32603, '\'target\' parameter is missing');
  }

  var method = target[request.method];
  if (!method || typeof method !== 'function') {
    throw createError(-32601);
  }

  return method.apply(undefined, request.params);
}

function buildResponse(fn) {
  var id = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  if (!fn) {
    throw createError(-32603, '\'fn\' parameter is missing');
  }
  if (typeof fn !== 'function') {
    throw createError(-32603, '\'fn\' parameter must be a function');
  }

  validateIdAttribute(id);

  var result = void 0;

  try {
    result = fn();
  } catch (err) {
    return buildResponseWithError(err, id);
  }

  if ((0, _isPromise2.default)(result)) {
    return result.then(function (res) {
      return buildResponseWithResult(res, id);
    }).catch(function (err) {
      return buildResponseWithError(err, id);
    });
  } else {
    return buildResponseWithResult(result, id);
  }
}

function handleRequestAndBuildResponse(request, target) {
  var id = request && request.id || null;
  return buildResponse(function () {
    return handleRequest(request, target);
  }, id);
}

function handleResponse(response) {
  var requestId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  validateResponse(response);
  validateIdAttribute(requestId);

  var result = response.result,
      error = response.error,
      id = response.id;


  if (id !== requestId) {
    throw createError(-32603, 'Request \'id\' and response \'id\' do not match');
  }

  if (error) {
    var err = new Error(error.message);
    err.code = error.code;
    Object.assign(err, error.data);
    throw err;
  } else {
    return result;
  }
}

function buildResponseWithResult(result, id) {
  var response = { jsonrpc: '2.0', id: id };
  if (result !== undefined) response.result = result;
  validateResponse(response);
  return response;
}

function buildResponseWithError(err, id) {
  if (!err) throw createError(-32603, '\'err\' parameter is missing');

  var error = {
    code: err.code || 1,
    message: err.message,
    data: { name: err.name }
  };
  for (var _iterator = Object.keys(err), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
    var _ref;

    if (_isArray) {
      if (_i >= _iterator.length) break;
      _ref = _iterator[_i++];
    } else {
      _i = _iterator.next();
      if (_i.done) break;
      _ref = _i.value;
    }

    var key = _ref;

    if (key === 'code' || key === 'message' || key === 'name') continue;
    error.data[key] = err[key];
  }

  var response = { jsonrpc: '2.0', error: error, id: id };
  validateResponse(response);
  return response;
}

function validateRequest(_ref2) {
  var jsonrpc = _ref2.jsonrpc,
      method = _ref2.method,
      id = _ref2.id,
      params = _ref2.params;

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

function validateResponse(_ref3) {
  var jsonrpc = _ref3.jsonrpc,
      result = _ref3.result,
      error = _ref3.error,
      id = _ref3.id;

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

var errors = {
  '-32700': 'Parse error',
  '-32600': 'Invalid Request',
  '-32601': 'Method not found',
  '-32602': 'Invalid params',
  '-32603': 'Internal error'
};

function createError(code, message) {
  if (!message) message = errors[String(code)];
  if (!message) return createError(-32603);
  var err = new Error(message);
  err.code = code;
  err.jsonRPCError = true;
  return err;
}

exports.default = {
  createRequestBuilder: createRequestBuilder,
  handleRequest: handleRequest,
  buildResponse: buildResponse,
  handleRequestAndBuildResponse: handleRequestAndBuildResponse,
  handleResponse: handleResponse
};
});

var index = createCommonjsModule(function (module, exports) {
'use strict';

exports.__esModule = true;

var _easyJsonRpc = index$2;

var _easyJsonRpc2 = _interopRequireDefault(_easyJsonRpc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createHandler(module) {
  var properties = getModuleProperties(module);

  module.__getModuleProperties__ = function () {
    return properties;
  };

  return function (event, context, callback) {
    Promise.resolve(_easyJsonRpc2.default.handleRequestAndBuildResponse(event, module)).then(function (result) {
      callback(null, result);
    }).catch(callback);
  };
}

function getModuleProperties(module) {
  var properties = [];

  for (var _iterator = Object.keys(module), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
    var _ref;

    if (_isArray) {
      if (_i >= _iterator.length) break;
      _ref = _iterator[_i++];
    } else {
      _i = _iterator.next();
      if (_i.done) break;
      _ref = _i.value;
    }

    var name = _ref;

    if (name === '__esModule') continue;
    var value = module[name];
    var type = typeof value;
    var property = { name, type };
    if (type !== 'function') property.value = value;
    properties.push(property);
  }

  return properties;
}

exports.default = { createHandler };
});

var index$1 = unwrapExports(index);

module.exports = index$1;
