'use strict';

var example = require('remotify-example-client');

example.random()
  .then(function(result) { document.write('<h1>' + result + '</h1>'); })
  .catch(function(err) { document.write(err.message); });
