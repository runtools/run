import StringResource from '../../src/resources/string';

describe('StringResource', () => {
  test('can have a string value', () => {
    expect(new StringResource().$value).toBeUndefined();
    expect(new StringResource({$value: ''}).$value).toBe('');
    expect(new StringResource({$value: 'green'}).$value).toBe('green');
    expect(new StringResource('blue').$value).toBe('blue');
    expect(() => new StringResource({$value: 123})).toThrow();
    expect(() => new StringResource(123)).toThrow();
  });

  test('can be instantiated', () => {
    const base = new StringResource('green');
    const instance = base.$instantiate();
    expect(instance).toBeInstanceOf(StringResource);
    expect(instance.$value).toBe('green');
    instance.$value = 'yellow';
    expect(instance.$value).toBe('yellow');
    expect(base.$value).toBe('green');
  });

  test('is serializable', () => {
    expect(new StringResource().$serialize()).toBeUndefined();
    expect(new StringResource({$id: 'color'}).$serialize()).toEqual({$id: 'color'});
    expect(new StringResource({$id: 'color', $value: 'green'}).$serialize()).toEqual({
      $id: 'color',
      $value: 'green'
    });
    expect(new StringResource({$value: 'green'}).$serialize()).toBe('green');
    expect(
      new StringResource({$id: 'color', $value: 'green'}).$instantiate().$serialize()
    ).toBeUndefined();
  });
});
