const uuid = require('uuid/v4');

export default function() {
  return {message: 'Hello, World!', uuid: uuid()};
}
