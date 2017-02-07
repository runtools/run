'use strict';

var rpc = require('easy-json-rpc').default;

exports.createHandler = function createHandler(service) {
  return function(event, context, callback) {
    Promise.resolve(rpc.handleRequestAndBuildResponse(event, service))
      .then(function(result) { callback(null, result); })
      .catch(callback);
  };
};
