const clc = require('cli-color');

module.exports = function([what = 'world'], { color = 'white' }) {
  console.log('hello', clc[color](what));
};
