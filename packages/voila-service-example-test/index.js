'use strict';

var example = require('voila-service-example-client')({
  url: 'https://jmr7rf718a.execute-api.us-east-1.amazonaws.com/voila_service_example'
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
