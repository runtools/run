export function getPrimitiveResourceClass(type: string) {
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
    case 'method':
      return require('./method').default;
    case 'command':
      return require('./command').default;
    case 'macro':
      return require('./macro').default;
    case 'tool':
      return require('./tool').default;
    default:
      return undefined;
  }
}
