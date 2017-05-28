import ObjectResource from '../../src/resources/object';

describe('ObjectResource', () => {
  test('can have an object value', () => {
    expect(new ObjectResource().$value).toBeUndefined();
    expect(new ObjectResource({$value: {}}).$value).toEqual({});
    expect(new ObjectResource({$value: {name: 'Manu'}}).$value).toEqual({name: 'Manu'});
    expect(new ObjectResource({name: 'Manu'}).$value).toEqual({name: 'Manu'});
    expect(new ObjectResource({$value: {$id: 'abc', $xyz: 123}}).$value).toEqual({
      $id: 'abc',
      $xyz: 123
    });
    expect(() => new ObjectResource({$value: 'hello'})).toThrow();
    expect(() => new ObjectResource('hello')).toThrow();
  });

  test('can parse a string', () => {
    expect(() => new ObjectResource({$value: '{}'})).toThrow();
    expect(new ObjectResource({$value: '{}'}, {parse: true}).$value).toEqual({});
    expect(new ObjectResource({$value: '{a: 1}'}, {parse: true}).$value).toEqual({a: 1});
    expect(() => new ObjectResource({$value: ''}, {parse: true})).toThrow();
    expect(() => new ObjectResource({$value: '[]'}, {parse: true})).toThrow();
    expect(() => new ObjectResource({$value: 'Invalid JSON'}, {parse: true})).toThrow();
  });

  test('has an immutable value', () => {
    const obj = new ObjectResource({name: 'Manu'});
    expect(obj.$value).toEqual({name: 'Manu'});
    expect(() => {
      obj.$value.name = 'Manuel';
    }).toThrow();
    expect(obj.$value.name).toBe('Manu');
    expect(() => {
      obj.$value.age = 44;
    }).toThrow();
    expect(obj.$value.age).toBeUndefined();
  });

  test('is serializable', () => {
    expect(new ObjectResource().$serialize()).toBeUndefined();
    expect(new ObjectResource({name: 'Manu', age: 44}).$serialize()).toEqual({
      name: 'Manu',
      age: 44
    });
  });
});
