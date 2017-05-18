import ObjectResource from '../../src/resources/object';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';

describe('ObjectResource', () => {
  test('can define simple properties', async () => {
    const person = await ObjectResource.$create({
      name: {
        $type: 'string',
        $value: 'Manu'
      }
    });
    expect(person.$getProperty('name')).toBeDefined();
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.$getProperty('name').$value).toBe('Manu');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
  });

  test('can define properties from literals', async () => {
    const person = await ObjectResource.$create({name: 'Manu', age: 44, address: {city: 'London'}});
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getProperty('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
    expect(person.$getProperty('address')).toBeInstanceOf(ObjectResource);
    expect(person.address.city).toBe('London');
  });

  test('can define composed properties', async () => {
    const person = await ObjectResource.$create({
      address: {
        $type: {
          city: {$type: 'string'}
        }
      }
    });
    expect(person.address).toBeDefined();
    expect(person.address).toBeInstanceOf(ObjectResource);
    expect(person.address.$getProperty('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    person.address = {city: 'Tokyo'};
    expect(person.address).toBeInstanceOf(ObjectResource);
    expect(person.address.city).toBe('Tokyo');
    expect(() => {
      person.address = 'New York';
    }).toThrow();
  });

  test('can inherit properties', async () => {
    const person = await ObjectResource.$create({
      $type: {$id: 'person', name: {$type: 'string', $value: 'anonymous'}}
    });
    const parent = person.$findParent(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.$getProperty('name')).toBeDefined();
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('anonymous');
    person.name = 'Manu';
    expect(person.name).toBe('Manu');
    expect(parent.name).toBe('anonymous');
  });

  test('can set value of inherited properties', async () => {
    const person = await ObjectResource.$create({
      $type: {$id: 'person', name: {$type: 'string', $value: 'anonymous'}},
      name: 'Manu'
    });
    const parent = person.$findParent(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
  });

  test('can have a runtime', async () => {
    expect((await ObjectResource.$create()).$runtime).toBeUndefined();
    expect((await ObjectResource.$create({$runtime: 'node@>=6.10.0'})).$runtime.toJSON()).toBe(
      'node@>=6.10.0'
    );
    await expect(ObjectResource.$create({$runtime: 'invalid'})).rejects.toBeInstanceOf(Error);
  });

  test('can have an implementation', async () => {
    expect((await ObjectResource.$create()).$implementation).toBeUndefined();
    expect(
      (await ObjectResource.$create(
        {$implementation: './fixtures/person/index.js', $runtime: 'node'},
        {directory: __dirname}
      )).$implementation
    ).toBe('./fixtures/person/index.js');
    await expect(
      ObjectResource.$create(
        {$implementation: './fixtures/person/index.js'},
        {directory: __dirname}
      )
    ).rejects.toBeInstanceOf(Error);
  });

  test('is serializable', async () => {
    async function testSerialization(definition, options, expected = definition) {
      expect((await ObjectResource.$create(definition, options)).$serialize()).toEqual(expected);
    }
    await testSerialization(undefined);
    await testSerialization({color: {$type: 'string'}});
    await testSerialization({color: 'green'});
    await testSerialization({name: 'Manu', address: {city: 'Tokyo'}});
    await testSerialization({$type: 'object'});
    await testSerialization({$type: {$id: 'person', name: 'anonymous'}});
    await testSerialization({$type: {$id: 'person', name: 'anonymous'}, name: 'Manu'});
    await testSerialization(
      {$implementation: './fixtures/person/index.js', $runtime: 'node@>=6.10.0'},
      {directory: __dirname}
    );
  });
});
