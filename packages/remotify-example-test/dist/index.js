(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var example = require('remotify-example-client');

example.random()
  .then(function(result) { document.write('<h1>' + result + '</h1>'); })
  .catch(function(err) { document.write(err.message); });

},{"remotify-example-client":6}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.createRequestBuilder = createRequestBuilder;
exports.handleRequest = handleRequest;
exports.buildResponse = buildResponse;
exports.handleRequestAndBuildResponse = handleRequestAndBuildResponse;
exports.handleResponse = handleResponse;

var _isPromise = require('is-promise');

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
},{"is-promise":3}],3:[function(require,module,exports){
module.exports = isPromise;

function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

},{}],4:[function(require,module,exports){
// the whatwg-fetch polyfill installs the fetch() function
// on the global object (window or self)
//
// Return that as the export for use in Webpack, Browserify etc.
require('whatwg-fetch');
module.exports = self.fetch.bind(self);

},{"whatwg-fetch":7}],5:[function(require,module,exports){
'use strict';

var fetch = require('isomorphic-fetch');
var rpc = require('easy-json-rpc').default;

module.exports = function(options) {
  var url = options.url;

  return {
    createFunction: function(name) {
      return function() {
        var request = rpc.createRequestBuilder(name).apply(null, arguments);
        request = JSON.stringify(request);

        return fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: request
        })
        .then(function(response) {
          if (response.status !== 200) {
            var message = 'Unexpected HTTP response (status: ' + response.status + ')';
            throw new Error(message);
          }
          return response.json();
        })
        .then(function(response) {
          if (response.jsonrpc) { // Remotify server response
            return rpc.handleResponse(response);
          } else if (response.errorMessage) { // Lambda error
            throw new Error(response.errorMessage);
          } else {
            throw new Error('An unknown error occurred while calling a remote API');
          }
        });
      };
    }
  };
};

},{"easy-json-rpc":2,"isomorphic-fetch":4}],6:[function(require,module,exports){
"use strict";

var client = require("remotify-client")({
  url: "https://ygp7xwwt7k.execute-api.us-east-1.amazonaws.com/remotify_example"
});

exports["random"] = client.createFunction("random");
exports["subtract"] = client.createFunction("subtract");
exports["sleep"] = client.createFunction("sleep");
exports["boolean"] = true;
exports["number"] = 123.45;
exports["string"] = "Hello";
exports["object"] = {"a":1,"b":2};
exports["date"] = "2017-02-06T02:14:29.293Z";

},{"remotify-client":5}],7:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    rawHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = 'status' in options ? options.status : 200
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}]},{},[1]);
