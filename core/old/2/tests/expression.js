import Expression from '../src/expression';

describe('Expression', () => {
  test('must have a valid definition', () => {
    expect(() => new Expression()).toThrow();
    expect(() => new Expression({})).toThrow();
    const expression = new Expression([]);
    expect(() => new Expression(expression)).not.toThrow();
  });

  test('can be constructed from an array', () => {
    const currentDir = process.cwd();
    const expression = new Expression(['hello', 'world', '--color=green'], {currentDir});
    expect(expression.arguments).toEqual(['hello', 'world']);
    expect(expression.config).toEqual({color: 'green'});
    expect(expression.getCurrentDir()).toBe(currentDir);
  });

  test('can be cloned', () => {
    const currentDir = process.cwd();
    const expression = new Expression(['hello', 'world', '--color=green'], {currentDir});
    const clone = expression.clone();
    expect(clone).toBeInstanceOf(Expression);
    expect(clone).not.toBe(expression);
    expect(clone.arguments).toEqual(expression.arguments);
    expect(clone.config).toEqual(expression.config);
    expect(clone.getCurrentDir()).toBe(currentDir);
  });

  test('can parse command line arguments', () => {
    expect(Expression.parse('hello world --color=green')).toEqual([
      ['hello', 'world', '--color=green']
    ]);

    /* eslint-disable no-template-curly-in-string */
    expect(Expression.parse('hello $1 --color=${config.color}')).toEqual([
      ['hello', {__var__: '1'}, '--color', {__var__: 'config.color'}]
    ]);
    /* eslint-enable no-template-curly-in-string */

    expect(Expression.parse('prepare coffee, warm toast, enjoy')).toEqual([
      ['prepare', 'coffee'],
      ['warm', 'toast'],
      ['enjoy']
    ]);
  });
});
