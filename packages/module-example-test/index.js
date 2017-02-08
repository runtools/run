'use strict';

var example = require('@voila/module-example-client')({
  url: 'https://8j9lqqqag8.execute-api.ap-northeast-1.amazonaws.com/voila_module_example'
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
