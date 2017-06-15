import StringResource from '../../src/primitives/string';

describe('StringResource', () => {
  test('creation', () => {
    expect(new StringResource().$value).toBeUndefined();
    expect(new StringResource({$value: ''}).$value).toBe('');
    expect(new StringResource({$value: 'green'}).$value).toBe('green');
    expect(new StringResource('blue').$value).toBe('blue');
    expect(() => new StringResource({$value: 123})).toThrow();
    expect(() => new StringResource(123)).toThrow();
  });

  test('serialization', () => {
    expect(new StringResource().$serialize()).toBeUndefined();
    expect(new StringResource({$name: 'color'}).$serialize()).toEqual({$name: 'color'});
    expect(new StringResource({$name: 'color', $value: 'green'}).$serialize()).toEqual({
      $name: 'color',
      $value: 'green'
    });
    expect(new StringResource({$value: 'green'}).$serialize()).toBe('green');
  });
});
