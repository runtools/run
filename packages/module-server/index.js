'use strict';

var rpc = require('easy-json-rpc').default;

exports.createHandler = function createHandler(module) {
  return function(event, context, callback) {
    Promise.resolve(rpc.handleRequestAndBuildResponse(event, module))
      .then(function(result) { callback(null, result); })
      .catch(callback);
  };
};
