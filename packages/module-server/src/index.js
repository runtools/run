'use strict';

import rpc from 'easy-json-rpc';

export function createHandler(module) {
  const properties = getModuleProperties(module);

  module.__getModuleProperties__ = function() {
    return properties;
  };

  return function(event, context, callback) {
    Promise.resolve(rpc.handleRequestAndBuildResponse(event, module))
      .then(function(result) { callback(null, result); })
      .catch(callback);
  };
}

function getModuleProperties(module) {
  const properties = [];

  for (const name of Object.keys(module)) {
    if (name === '__esModule') continue;
    const value = module[name];
    const type = typeof value;
    const property = { name, type };
    if (type !== 'function') property.value = value;
    properties.push(property);
  }

  return properties;
}
