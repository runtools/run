const clc = require('cli-color');

module.exports = function([name = 'World'], {color}) { // <-----------
  console.log(`Hello, ${clc[color](name)}!`);
};
