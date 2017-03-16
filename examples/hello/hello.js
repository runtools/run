const clc = require('cli-color');

module.exports = function([name], {color}) {
  console.log(`Hello, ${clc[color](name)}!`);
};
