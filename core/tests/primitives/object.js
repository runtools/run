import ObjectResource from '../../src/primitives/object';

describe('ObjectResource', () => {
  test('creation', () => {
    expect(new ObjectResource().$value).toBeUndefined();
    expect(new ObjectResource({$value: {}}).$value).toEqual({});
    expect(new ObjectResource({$value: {name: 'Manu'}}).$value).toEqual({name: 'Manu'});
    expect(new ObjectResource({$value: {$name: 'abc', $xyz: 123}}).$value).toEqual({
      $name: 'abc',
      $xyz: 123
    });
    expect(() => new ObjectResource({$value: 'hello'})).toThrow();
  });

  test('parsing', () => {
    expect(() => new ObjectResource({$value: '{}'})).toThrow();
    expect(new ObjectResource({$value: '{}'}, {parse: true}).$value).toEqual({});
    expect(new ObjectResource({$value: '{a: 1}'}, {parse: true}).$value).toEqual({a: 1});
    expect(() => new ObjectResource({$value: ''}, {parse: true})).toThrow();
    expect(() => new ObjectResource({$value: '[]'}, {parse: true})).toThrow();
    expect(() => new ObjectResource({$value: 'Invalid JSON'}, {parse: true})).toThrow();
  });

  test('immutability', () => {
    const obj = new ObjectResource({$value: {name: 'Manu'}});
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

  test('serialization', () => {
    expect(new ObjectResource().$serialize()).toBeUndefined();
    expect(new ObjectResource({$value: {name: 'Manu', age: 44}}).$serialize()).toEqual({
      name: 'Manu',
      age: 44
    });
  });
});
