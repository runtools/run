import ObjectResource from '../../../dist/primitives/object';

describe('ObjectResource', () => {
  test('creation', async () => {
    expect(await ObjectResource.$create()).toBeInstanceOf(ObjectResource);
    expect((await ObjectResource.$create()).$value).toBeUndefined();
    expect((await ObjectResource.$create({$value: {}})).$value).toEqual({});
    expect((await ObjectResource.$create({$value: {name: 'Manu'}})).$value).toEqual({name: 'Manu'});
    expect((await ObjectResource.$create({$value: {$name: 'abc', $xyz: 123}})).$value).toEqual({
      $name: 'abc',
      $xyz: 123
    });
    await expect(ObjectResource.$create({$value: 'hello'})).rejects.toBeInstanceOf(Error);
  });

  // test('parsing', () => {
  //   expect(() => ObjectResource.$create({$value: '{}'})).toThrow();
  //   expect(ObjectResource.$create({$value: '{}'}, {parse: true}).$value).toEqual({});
  //   expect(ObjectResource.$create({$value: '{a: 1}'}, {parse: true}).$value).toEqual({a: 1});
  //   expect(() => ObjectResource.$create({$value: ''}, {parse: true})).toThrow();
  //   expect(() => ObjectResource.$create({$value: '[]'}, {parse: true})).toThrow();
  //   expect(() => ObjectResource.$create({$value: 'Invalid JSON'}, {parse: true})).toThrow();
  // });

  test('immutability', async () => {
    const obj = await ObjectResource.$create({$value: {name: 'Manu'}});
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

  test('serialization', async () => {
    expect((await ObjectResource.$create()).$serialize()).toBeUndefined();
    expect((await ObjectResource.$create({$value: {name: 'Manu', age: 44}})).$serialize()).toEqual({
      name: 'Manu',
      age: 44
    });
  });
});
