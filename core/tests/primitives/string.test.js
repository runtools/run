import StringResource from '../../src/primitives/string';

describe('StringResource', () => {
  test('creation', () => {
    expect(StringResource.$create()).toBeInstanceOf(StringResource);
    expect(StringResource.$create().$value).toBeUndefined();
    expect(StringResource.$create({$value: ''}).$value).toBe('');
    expect(StringResource.$create({$value: 'green'}).$value).toBe('green');
    expect(StringResource.$create('blue').$value).toBe('blue');
    expect(() => StringResource.$create({$value: 123})).toThrow();
    expect(() => StringResource.$create(123)).toThrow();
  });

  test('serialization', () => {
    expect(StringResource.$create().$serialize()).toBeUndefined();
    expect(StringResource.$create({$name: 'color'}).$serialize()).toEqual({$name: 'color'});
    expect(StringResource.$create({$name: 'color', $value: 'green'}).$serialize()).toEqual({
      $name: 'color',
      $value: 'green'
    });
    expect(StringResource.$create({$value: 'green'}).$serialize()).toBe('green');
  });
});
