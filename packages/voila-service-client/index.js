'use strict';

var fetch = require('isomorphic-fetch');
var rpc = require('easy-json-rpc').default;

module.exports = function(options) {
  if (!options) options = {};
  var url = options.url;
  if (!url) throw new Error('\'url\' parameter is missing in Voila Service client');

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
          if (response.jsonrpc) { // Voila Service server response
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
