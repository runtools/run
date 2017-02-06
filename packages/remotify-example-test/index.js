'use strict';

var example = require('remotify-example-client')({
  url: 'https://jmr7rf718a.execute-api.us-east-1.amazonaws.com/remotify_example'
});

example.random()
  .then(function(result) {
    console.log(result);
    process.browser && document.write('<h1>' + result + '</h1>');
  })
  .catch(function(err) {
    console.error(err);
    process.browser && document.write(err.message);
  });
