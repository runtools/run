import Resource from '../../../dist/resource';
import BooleanResource from '../../../dist/resource/boolean';
import NumberResource from '../../../dist/resource/number';
import StringResource from '../../../dist/resource/string';
import ArrayResource from '../../../dist/resource/array';
import ObjectResource from '../../../dist/resource/object';

describe('Resource', () => {
  test('creation', async () => {
    expect(await Resource.$create()).toBeInstanceOf(Resource);
    expect(await Resource.$create({})).toBeInstanceOf(Resource);
    expect(await Resource.$create({'@type': 'resource'})).toBeInstanceOf(Resource);
    await expect(Resource.$create({'@type': 'invalid'})).rejects.toBeInstanceOf(Error);

    expect(await Resource.$create({'@type': 'boolean'})).toBeInstanceOf(BooleanResource);
    expect(await Resource.$create(true)).toBeInstanceOf(BooleanResource);
    expect(await Resource.$create({'@value': false})).toBeInstanceOf(BooleanResource);

    expect(await Resource.$create({'@type': 'number'})).toBeInstanceOf(NumberResource);
    expect(await Resource.$create(123.45)).toBeInstanceOf(NumberResource);
    expect(await Resource.$create({'@value': 0})).toBeInstanceOf(NumberResource);

    expect(await Resource.$create({'@type': 'string'})).toBeInstanceOf(StringResource);
    expect(await Resource.$create('Hello')).toBeInstanceOf(StringResource);
    expect(await Resource.$create({'@value': ''})).toBeInstanceOf(StringResource);

    expect(await Resource.$create({'@type': 'array'})).toBeInstanceOf(ArrayResource);
    expect(await Resource.$create([1])).toBeInstanceOf(ArrayResource);
    expect(await Resource.$create({'@value': []})).toBeInstanceOf(ArrayResource);

    expect(await Resource.$create({'@type': 'object'})).toBeInstanceOf(ObjectResource);
    expect(await Resource.$create({'@type': 'object', '@value': {name: 'Manu'}})).toBeInstanceOf(
      ObjectResource
    );
    expect((await Resource.$create({'@type': 'object', '@value': {name: 'Manu'}})).$value).toEqual({
      name: 'Manu'
    });
    expect(await Resource.$create({'@value': {}})).toBeInstanceOf(ObjectResource);
  });

  test('emptiness', async () => {
    const res = await Resource.$create();
    expect(res.$aliases).toBeUndefined();
    expect(res.$hasAlias('hi')).toBe(false);
  });

  test.skip('@id', async () => {
    const res = await Resource.$create();
    expect(res.$identifier).toBeUndefined();
    expect(res.$getNamespace()).toBeUndefined();
    expect(res.$getName()).toBeUndefined();
    res.$identifier = 'run/hello';
    expect(res.$identifier).toBe('run/hello');
    expect(res.$getNamespace()).toBe('run');
    expect(res.$getName()).toBe('hello');
  });

  test.skip('@id validation', async () => {
    await expect(Resource.$create({'@id': ''})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': 'hello'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': 'run/hello'})).resolves.toBeInstanceOf(Resource);
    await expect(Resource.$create({'@id': 'run/hello-world'})).resolves.toBeInstanceOf(Resource);
    await expect(Resource.$create({'@id': 'run/hello-'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': 'run/hello*world'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': 'run/-hello'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': 'run/hello--world'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': 'run/'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': '/hello'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@id': 'run/hello/hi'})).rejects.toBeInstanceOf(Error);
  });

  test('@aliases', async () => {
    const res = await Resource.$create({'@aliases': ['hi']});
    expect(res.$hasAlias('hi')).toBe(true);
    expect(res.$hasAlias('bonjour')).toBe(false);
    res.$addAlias('bonjour');
    expect(res.$hasAlias('bonjour')).toBe(true);
  });

  test('@parameters', async () => {
    const res = await Resource.$create({
      '@parameters': {name: {'@type': 'string', '@position': 0}, age: {'@type': 'number'}}
    });
    const params = res.$getParameters();
    expect(params).toHaveLength(2);
    expect(params[0]).toBeInstanceOf(StringResource);
    expect(params[0].$getKey()).toBe('name');
    expect(params[0].$position).toBe(0);
    expect(params[1]).toBeInstanceOf(NumberResource);
    expect(params[1].$getKey()).toBe('age');
    expect(params[1].$position).toBeUndefined();
  });

  test.skip('@version', async () => {
    expect((await Resource.$create()).$version).toBeUndefined();
    expect((await Resource.$create({'@version': '1.2.3'})).$version.toString()).toBe('1.2.3');
    await expect(Resource.$create({'@version': '1.2.3.4'})).rejects.toBeInstanceOf(Error);
  });

  test('@help', async () => {
    expect((await Resource.$create()).$help).toBeUndefined();
    expect((await Resource.$create({'@help': 'This is a resource'})).$help).toBe(
      'This is a resource'
    );
  });

  test.skip('@repository', async () => {
    expect((await Resource.$create()).$repository).toBeUndefined();
    expect(
      (await Resource.$create({'@repository': 'git://github.com/user/repo'})).$repository
    ).toBe('git://github.com/user/repo');
  });

  test('@runtime', async () => {
    expect((await Resource.$create()).$runtime).toBeUndefined();
    expect((await Resource.$create({'@runtime': 'node#>=6.10.0'})).$runtime.toJSON()).toBe(
      'node#>=6.10.0'
    );
  });

  test('@implementation', async () => {
    expect((await Resource.$create()).$implementation).toBeUndefined();
    expect(
      (await Resource.$create(
        {'@implementation': '../../fixtures/person/index.js'},
        {directory: __dirname}
      )).$implementation
    ).toBe('../../fixtures/person/index.js');
  });

  test.skip('@files', async () => {
    expect((await Resource.$create()).$files).toBeUndefined();
    expect((await Resource.$create({'@files': ['./dist']})).$files).toEqual(['./dist']);
  });

  test('@hidden', async () => {
    expect((await Resource.$create()).$hidden).toBeUndefined();
    expect((await Resource.$create({'@hidden': false})).$hidden).toBe(false);
    expect((await Resource.$create({'@hidden': true})).$hidden).toBe(true);
  });

  test('simple property definition', async () => {
    const person = await Resource.$create({name: {'@type': 'string', '@value': 'Manu'}});
    expect(person.$getChild('name')).toBeDefined();
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');

    await expect(Resource.$create({'@invalidKey': 'value'})).rejects.toBeInstanceOf(Error);
  });

  test('properties defined from literals', async () => {
    const person = await Resource.$create({name: 'Manu', age: 44, address: {city: 'London'}});
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getChild('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
    expect(person.$getChild('address')).toBeInstanceOf(Resource);
    expect(person.$getChild('address')).toBe(person.address);
    expect(person.address.city).toBe('London');
  });

  test('properties redefined', async () => {
    const person = await Resource.$create({
      name: {'@type': 'string', '@help': 'Name', '@value': 'Manu'}
    });
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getChild('name').$help).toBe('Name');
    await person.$setChild('name', 'Manuel');
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manuel');
    expect(person.$getChild('name').$help).toBeUndefined();
    await person.$setChild('name', {'@value': 'mvila', '@help': 'The name'});
    expect(person.name).toBe('mvila');
    expect(person.$getChild('name').$help).toBe('The name');
    await person.$setChild('name', 123); // Since there is no parent, we can change the type
    expect(person.$getChild('name')).toBeInstanceOf(NumberResource);
    expect(person.name).toBe(123);
  });

  test('composed properties', async () => {
    const definition = {'@export': {city: {'@type': 'string'}}};
    const person = await Resource.$create({address: {'@import': definition}});
    expect(person.address).toBeInstanceOf(Resource);
    expect(person.address.$getChild('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
  });

  test('inherited properties', async () => {
    const definition = {'@export': {name: 'anonymous'}};
    const person = await Resource.$create({'@import': definition});
    const parent = person.$findBase(() => true);
    expect(parent.$getChild('name')).toBeInstanceOf(StringResource);
    expect(parent.name).toBe('anonymous');
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('anonymous');
    person.name = 'Manu';
    expect(person.name).toBe('Manu');
    expect(parent.name).toBe('anonymous');
  });

  test('inherited properties redefined', async () => {
    const definition = {'@export': {name: 'anonymous'}};
    const person = await Resource.$create({'@import': definition});
    const parent = person.$findBase(() => true);
    await person.$setChild('name', 'Manuel');
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
    // Setting a type incompatible with the parent type throws an error
    await expect(person.$setChild('name', 123)).rejects.toBeInstanceOf(Error);
  });

  test('inherited properties with a value', async () => {
    const definition = {'@export': {name: 'anonymous'}};
    const person = await Resource.$create({'@import': definition, name: 'Manu'});
    const parent = person.$findBase(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
  });

  test('inherited composed properties', async () => {
    const definition = {'@export': {address: {'@import': {'@export': {city: 'unknown'}}}}};
    const person = await Resource.$create({'@import': definition});
    const parent = person.$findBase(() => true);
    expect(parent.address.city).toBe('unknown');
    expect(person.address.city).toBe('unknown');
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    expect(parent.address.city).toBe('unknown');
  });

  test('inherited composed properties with a value', async () => {
    const definition = {
      '@export': {
        address: {'@import': {'@export': {city: {'@value': 'unknown', '@help': 'The city'}}}}
      }
    };
    const person = await Resource.$create({
      '@import': definition,
      address: {city: 'Tokyo'}
    });
    const parent = person.$findBase(() => true);
    expect(parent.address.city).toBe('unknown');
    expect(parent.address.$getChild('city').$help).toBe('The city');
    expect(person.address.city).toBe('Tokyo');
    expect(person.address.$getChild('city').$help).toBe('The city');
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    expect(parent.address.city).toBe('unknown');
    person.address.$getChild('city').$help = 'La ville';
    expect(person.address.$getChild('city').$help).toBe('La ville');
    expect(parent.address.$getChild('city').$help).toBe('The city');
  });

  test('Resource loaded from a file', async () => {
    const PersonConstructor = await Resource.$load('../../fixtures/person', {directory: __dirname});
    expect(PersonConstructor).toBeInstanceOf(Resource);
    expect(PersonConstructor.$getChild('name')).toBeUndefined();
    expect(PersonConstructor.$getChild('age')).toBeUndefined();

    const person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});
    expect(person).toBeInstanceOf(Resource);
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getChild('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
  });

  test('Resource imported from a file', async () => {
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    expect(Person).toBeInstanceOf(Resource);
    expect(Person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(Person.name).toBeUndefined();
    expect(Person.$getChild('age')).toBeInstanceOf(NumberResource);
    expect(Person.age).toBeUndefined();
  });

  test('Resource imported from a file via a type', async () => {
    const person = await Resource.$create(
      {'@import': '../../fixtures/person'},
      {directory: __dirname}
    );
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.$getChild('age')).toBeInstanceOf(NumberResource);
    person.name = 'Manu';
    person.age = 44;
    expect(person.$serialize()).toEqual({
      '@import': '../../fixtures/person',
      name: 'Manu',
      age: 44
    });
  });

  test('Resource imported from a file via a property type', async () => {
    const Company = await Resource.$create(
      {name: {'@type': 'string'}, boss: {'@import': '../../fixtures/person'}},
      {directory: __dirname}
    );
    expect(Company.$getChild('name')).toBeInstanceOf(StringResource);
    expect(Company.$getChild('boss')).toBeInstanceOf(Resource);
    expect(Company.$getChild('boss').$getChild('name')).toBeInstanceOf(StringResource);
    expect(Company.$getChild('boss').$getChild('age')).toBeInstanceOf(NumberResource);
  });

  test('Resource loaded from a file', async () => {
    const person = await Resource.$create(
      {'@load': '../../fixtures/person-instance'},
      {directory: __dirname}
    );
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getChild('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
  });

  test('multiple inheritance', async () => {
    const personWithMixin = await Resource.$create(
      {
        '@import': ['../../fixtures/person', '../../fixtures/mixin'],
        name: 'Manu',
        mixinProperty: 'mixin-property-value'
      },
      {directory: __dirname}
    );
    expect(personWithMixin.$getChild('name')).toBeInstanceOf(StringResource);
    expect(personWithMixin.name).toBe('Manu');
    expect(personWithMixin.$getChild('mixinProperty')).toBeInstanceOf(StringResource);
    expect(personWithMixin.mixinProperty).toBe('mixin-property-value');
  });

  test('serialization', async () => {
    async function testSerialization(definition, options, expected) {
      if (arguments.length < 3) {
        expected = definition;
      }
      const resource = await Resource.$create(definition, options);
      expect(resource.$serialize()).toEqual(expected);
    }
    await testSerialization(undefined, undefined, undefined);
    await testSerialization({}, undefined, undefined);
    await testSerialization({'@type': 'resource'});
    await testSerialization({'@type': 'object'});
    await testSerialization({'@type': 'object', '@value': {}});
    await testSerialization({'@type': 'object', '@value': {name: 'Manu'}});
    await testSerialization({
      '@aliases': ['hi', 'bonjour'],
      '@parameters': {name: {'@type': 'string', '@position': 0}, age: {'@type': 'number'}},
      '@help': 'This is a resource',
      '@hidden': true
    });

    await testSerialization({color: {'@type': 'string'}});
    await testSerialization({color: 'green'});
    await testSerialization({name: 'Manu', address: {city: 'Tokyo'}});
    await testSerialization({
      '@import': {'@export': {name: 'anonymous'}}
    });
    await testSerialization({
      '@import': {'@export': {name: 'anonymous'}},
      name: 'Manu'
    });
    await testSerialization(
      {'@implementation': '../../fixtures/person/index.js', '@runtime': 'node#>=6.10.0'},
      {directory: __dirname}
    );
  });
});
