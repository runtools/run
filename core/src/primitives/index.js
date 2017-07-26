export function getPrimitiveResourceClass(type) {
  switch (type) {
    case 'boolean':
      return require('./boolean').default;
    case 'number':
      return require('./number').default;
    case 'string':
      return require('./string').default;
    case 'array':
      return require('./array').default;
    case 'object':
      return require('./object').default;
    case 'binary':
      return require('./binary').default;
    case 'method':
      return require('./method').default;
    case 'command':
      return require('./command').default;
    case 'macro':
      return require('./macro').default;
    default:
      return undefined;
  }
}
