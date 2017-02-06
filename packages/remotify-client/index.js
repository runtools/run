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
