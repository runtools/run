'use strict';

exports.random = function() {
  return Math.random();
};

exports.subtract = function(a, b) {
  return a - b;
};

exports.sleep = function(duration) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Ohayo!'), duration);
  });
};

exports.boolean = true;

exports.number = 123.45;

exports.string = 'Hello';

exports.object = { a: 1, b: 2 };

exports.date = new Date();
