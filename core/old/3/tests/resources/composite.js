import {createResource, loadResource} from '../../src/resources';
import CompositeResource from '../../src/resources/composite';
import StringResource from '../../src/resources/string';
import NumberResource from '../../src/resources/number';
import ObjectResource from '../../src/resources/object';

describe('CompositeResource', () => {
  test('can define simple properties', async () => {
    const person = await createResource({
      $type: 'composite',
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
    const person = await createResource({
      $type: 'composite',
      name: 'Manu',
      age: 44,
      address: {city: 'London'}
    });
    expect(person.$getProperty('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getProperty('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
    expect(person.$getProperty('address')).toBeInstanceOf(ObjectResource);
    expect(person.address.city).toBe('London');
  });

  test('can define composed properties', async () => {
    const person = await createResource({
      $type: 'composite',
      address: {
        $type: {
          $type: 'composite',
          city: {$type: 'string'}
        }
      }
    });
    expect(person.address).toBeDefined();
    expect(person.address).toBeInstanceOf(CompositeResource);
    expect(person.address.$getProperty('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    person.address = {city: 'Tokyo'};
    expect(person.address).toBeInstanceOf(CompositeResource);
    expect(person.address.city).toBe('Tokyo');
    expect(() => {
      person.address = 'New York';
    }).toThrow();
  });

  test('can inherit properties', async () => {
    const person = await createResource({
      $type: {$name: 'person', $type: 'composite', name: {$type: 'string', $value: 'anonymous'}}
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
    const person = await createResource({
      $type: {$name: 'person', $type: 'composite', name: {$type: 'string', $value: 'anonymous'}},
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
    expect((await createResource({$type: 'composite'})).$runtime).toBeUndefined();
    expect(
      (await createResource({
        $type: 'composite',
        $runtime: 'node@>=6.10.0'
      })).$runtime.toJSON()
    ).toBe('node@>=6.10.0');
    await expect(createResource({$type: 'composite', $runtime: 'invalid'})).rejects.toBeInstanceOf(
      Error
    );
  });

  test('can have an implementation', async () => {
    expect((await createResource({$type: 'composite'})).$implementation).toBeUndefined();
    expect(
      (await createResource(
        {$type: 'composite', $implementation: './fixtures/person/index.js', $runtime: 'node'},
        {directory: __dirname}
      )).$implementation
    ).toBe('./fixtures/person/index.js');
    await expect(
      createResource(
        {$type: 'composite', $implementation: './fixtures/person/index.js'},
        {directory: __dirname}
      )
    ).rejects.toBeInstanceOf(Error);
  });

  test('can customize $normalize and $serialize', async () => {
    const Person = await loadResource('./fixtures/person', {directory: __dirname});
    const person = Person.$instantiate({address: {city: 'Paris', country: 'France'}});
    expect(person.address.city).toBe('Paris');
    expect(person.address.country).toBe('France');
    expect(person.$serialize()).toEqual({address: 'Paris, France'});
    person.address = 'Paris, France';
    expect(person.address.city).toBe('Paris');
    expect(person.address.country).toBe('France');
    expect(person.$serialize()).toEqual({address: 'Paris, France'});
    person.address = 'Tokyo';
    expect(person.address.city).toBe('Tokyo');
    expect(person.address.country).toBeUndefined();
    expect(person.$serialize()).toEqual({address: 'Tokyo'});
  });

  test('is serializable', async () => {
    async function testSerialization(definition, options, expected = definition) {
      expect((await createResource(definition, options)).$serialize()).toEqual(expected);
    }
    await testSerialization({$type: 'composite'});
    await testSerialization({$type: 'composite', color: {$type: 'string'}});
    await testSerialization({$type: 'composite', color: 'green'});
    await testSerialization({$type: 'composite', name: 'Manu', address: {city: 'Tokyo'}});
    await testSerialization({$type: {$name: 'person', $type: 'composite', name: 'anonymous'}});
    await testSerialization({
      $type: {$name: 'person', $type: 'composite', name: 'anonymous'},
      name: 'Manu'
    });
    await testSerialization(
      {
        $type: 'composite',
        $implementation: './fixtures/person/index.js',
        $runtime: 'node@>=6.10.0'
      },
      {directory: __dirname}
    );
  });
});
