import Resource from '../../dist/resource';
import BooleanResource from '../../dist/primitives/boolean';
import NumberResource from '../../dist/primitives/number';
import StringResource from '../../dist/primitives/string';
import ArrayResource from '../../dist/primitives/array';
import ObjectResource from '../../dist/primitives/object';

describe('Resource', () => {
  test('creation', async () => {
    expect(await Resource.$create()).toBeInstanceOf(Resource);
    expect(await Resource.$create({})).toBeInstanceOf(Resource);
    expect(await Resource.$create({'@type': 'resource'})).toBeInstanceOf(Resource);
    expect(await Resource.$create({'@types': ['resource']})).toBeInstanceOf(Resource);
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
    expect(await Resource.$create({'@value': {}})).toBeInstanceOf(ObjectResource);
  });

  test('emptiness', async () => {
    const res = await Resource.$create();
    expect(res.$name).toBeUndefined();
    expect(res.$aliases).toBeUndefined();
    expect(res.$hasAlias('hi')).toBe(false);
  });

  test('@name', async () => {
    const res = await Resource.$create();
    expect(res.$name).toBeUndefined();
    expect(res.$getScope()).toBeUndefined();
    expect(res.$getIdentifier()).toBeUndefined();
    res.$name = 'hello';
    expect(res.$name).toBe('hello');
    expect(res.$getScope()).toBeUndefined();
    expect(res.$getIdentifier()).toBe('hello');
    res.$name = 'runtools/hello';
    expect(res.$name).toBe('runtools/hello');
    expect(res.$getScope()).toBe('runtools');
    expect(res.$getIdentifier()).toBe('hello');
  });

  test('@name validation', async () => {
    await expect(Resource.$create({'@name': 'hello'})).resolves.toBeInstanceOf(Resource);
    await expect(Resource.$create({'@name': 'runtools/hello'})).resolves.toBeInstanceOf(Resource);
    await expect(Resource.$create({'@name': ''})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@name': 'hello_world'})).resolves.toBeInstanceOf(Resource);
    await expect(Resource.$create({'@name': '_hello'})).resolves.toBeInstanceOf(Resource);
    await expect(Resource.$create({'@name': 'hello_'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@name': 'hello*'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@name': 'runtools/'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@name': '/hello'})).rejects.toBeInstanceOf(Error);
  });

  test('@aliases', async () => {
    const res = await Resource.$create({'@aliases': ['hi']});
    expect(res.$hasAlias('hi')).toBe(true);
    expect(res.$hasAlias('bonjour')).toBe(false);
    res.$addAlias('bonjour');
    expect(res.$hasAlias('bonjour')).toBe(true);
  });

  test('matching by @name or @aliases', async () => {
    const res = await Resource.$create({'@name': 'hello', '@aliases': ['hi', 'bonjour']});
    expect(res.$isMatching('hello')).toBe(true);
    expect(res.$isMatching('hi')).toBe(true);
    expect(res.$isMatching('bonjour')).toBe(true);
    expect(res.$isMatching('bye')).toBe(false);
  });

  test('@version', async () => {
    expect((await Resource.$create()).$version).toBeUndefined();
    expect((await Resource.$create({'@version': '1.2.3'})).$version.toString()).toBe('1.2.3');
    await expect(Resource.$create({'@version': '1.2.3.4'})).rejects.toBeInstanceOf(Error);
  });

  test('@description', async () => {
    expect((await Resource.$create()).$description).toBeUndefined();
    expect((await Resource.$create({'@description': 'This is a resource'})).$description).toBe(
      'This is a resource'
    );
  });

  test('@authors', async () => {
    expect((await Resource.$create()).$authors).toBeUndefined();
    expect((await Resource.$create({'@authors': 'Manu'})).$authors).toEqual(['Manu']);
    expect((await Resource.$create({'@authors': ['Manu', 'Paul']})).$authors).toEqual([
      'Manu',
      'Paul'
    ]);
  });

  test('@repository', async () => {
    expect((await Resource.$create()).$repository).toBeUndefined();
    expect(
      (await Resource.$create({'@repository': 'git://github.com/user/repo'})).$repository
    ).toBe('git://github.com/user/repo');
  });

  test('@license', async () => {
    expect((await Resource.$create()).$license).toBeUndefined();
    expect((await Resource.$create({'@license': 'MIT'})).$license).toBe('MIT');
  });

  test('@runtime', async () => {
    expect((await Resource.$create()).$runtime).toBeUndefined();
    expect((await Resource.$create({'@runtime': 'node@>=6.10.0'})).$runtime.toJSON()).toBe(
      'node@>=6.10.0'
    );
  });

  test('@implementation', async () => {
    expect((await Resource.$create()).$implementation).toBeUndefined();
    expect(
      (await Resource.$create(
        {'@implementation': '../fixtures/person/index.js'},
        {directory: __dirname}
      )).$implementation
    ).toBe('../fixtures/person/index.js');
  });

  test('@files', async () => {
    expect((await Resource.$create()).$files).toBeUndefined();
    expect((await Resource.$create({'@files': ['./dist']})).$files).toEqual(['./dist']);
  });

  test('@hidden', async () => {
    expect((await Resource.$create()).$hidden).toBeUndefined();
    expect((await Resource.$create({'@hidden': false})).$hidden).toBe(false);
    expect((await Resource.$create({'@hidden': true})).$hidden).toBe(true);
  });

  test('singular and plural property names', async () => {
    const res1 = await Resource.$create({'@author': 'Manu'});
    expect(res1.$authors).toEqual(['Manu']);

    const res2 = await Resource.$create({'@authors': ['Manu', 'Vince']});
    expect(res2.$authors).toEqual(['Manu', 'Vince']);

    let error;
    try {
      await Resource.$create({'@name': 'hello', '@authors': 'Manu', '@author': 'Manu'});
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(Error);
    expect(error.contextStack).toHaveLength(1);
    expect(error.contextStack[0]).toBeInstanceOf(Resource);
    expect(error.contextStack[0].$name).toBe('hello');
  });

  test('simple property definition', async () => {
    const person = await Resource.$create({name: {'@type': 'string', '@value': 'Manu'}});
    expect(person.$getChild('name')).toBeDefined();
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
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
      name: {'@type': 'string', '@description': 'Name', '@value': 'Manu'}
    });
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getChild('name').$description).toBe('Name');
    await person.$setChild('name', 'Manuel');
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manuel');
    expect(person.$getChild('name').$description).toBeUndefined();
    await person.$setChild('name', {'@value': 'mvila', '@description': 'The name'});
    expect(person.name).toBe('mvila');
    expect(person.$getChild('name').$description).toBe('The name');
    await person.$setChild('name', 123); // Since there is no parent, we can change the type
    expect(person.$getChild('name')).toBeInstanceOf(NumberResource);
    expect(person.name).toBe(123);
  });

  test('composed properties', async () => {
    const type = {'@export': {city: {'@type': 'string'}}};
    const person = await Resource.$create({address: {'@type': type}});
    expect(person.address).toBeInstanceOf(Resource);
    expect(person.address.$getChild('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
  });

  test('inherited properties', async () => {
    const type = {'@export': {name: 'anonymous'}};
    const person = await Resource.$create({'@type': type});
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
    const type = {'@export': {name: 'anonymous'}};
    const person = await Resource.$create({'@type': type});
    const parent = person.$findBase(() => true);
    await person.$setChild('name', 'Manuel');
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
    // Setting a type incompatible with the parent type throws an error
    await expect(person.$setChild('name', 123)).rejects.toBeInstanceOf(Error);
  });

  test('inherited properties with a value', async () => {
    const type = {'@export': {name: 'anonymous'}};
    const person = await Resource.$create({'@type': type, name: 'Manu'});
    const parent = person.$findBase(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
  });

  test('inherited composed properties', async () => {
    const type = {'@export': {address: {'@type': {'@export': {city: 'unknown'}}}}};
    const person = await Resource.$create({'@type': type});
    const parent = person.$findBase(() => true);
    expect(parent.address.city).toBe('unknown');
    expect(person.address.city).toBe('unknown');
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    expect(parent.address.city).toBe('unknown');
  });

  test('inherited composed properties with a value', async () => {
    const type = {
      '@export': {
        address: {'@type': {'@export': {city: {'@value': 'unknown', '@description': 'The city'}}}}
      }
    };
    const person = await Resource.$create({
      '@type': type,
      address: {city: 'Tokyo'}
    });
    const parent = person.$findBase(() => true);
    expect(parent.address.city).toBe('unknown');
    expect(parent.address.$getChild('city').$description).toBe('The city');
    expect(person.address.city).toBe('Tokyo');
    expect(person.address.$getChild('city').$description).toBe('The city');
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    expect(parent.address.city).toBe('unknown');
    person.address.$getChild('city').$description = 'La ville';
    expect(person.address.$getChild('city').$description).toBe('La ville');
    expect(parent.address.$getChild('city').$description).toBe('The city');
  });

  test('Resource loaded from a file', async () => {
    const PersonConstructor = await Resource.$load('../fixtures/person', {directory: __dirname});
    expect(PersonConstructor).toBeInstanceOf(Resource);
    expect(PersonConstructor.$name).toBe('person');
    expect(PersonConstructor.$version.toString()).toBe('1.0.0');
    expect(PersonConstructor.$getChild('name')).toBeUndefined();
    expect(PersonConstructor.$getChild('age')).toBeUndefined();

    const person = await Resource.$load('../fixtures/person-instance', {directory: __dirname});
    expect(person).toBeInstanceOf(Resource);
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$getChild('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
  });

  test('Resource imported from a file', async () => {
    const Person = await Resource.$import('../fixtures/person', {directory: __dirname});
    expect(Person).toBeInstanceOf(Resource);
    expect(Person.$name).toBeUndefined();
    expect(Person.$version).toBeUndefined();
    expect(Person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(Person.name).toBeUndefined();
    expect(Person.$getChild('age')).toBeInstanceOf(NumberResource);
    expect(Person.age).toBeUndefined();
  });

  test('Resource imported from a file via a type', async () => {
    const person = await Resource.$create(
      {'@name': 'manu', '@type': '../fixtures/person'},
      {directory: __dirname}
    );
    expect(person.$name).toBe('manu');
    expect(person.$getChild('name')).toBeInstanceOf(StringResource);
    expect(person.$getChild('age')).toBeInstanceOf(NumberResource);
    person.name = 'Manu';
    person.age = 44;
    expect(person.$serialize()).toEqual({
      '@name': 'manu',
      '@type': '../fixtures/person',
      name: 'Manu',
      age: 44
    });
  });

  test('Resource loaded from a property', async () => {
    const Company = await Resource.$create(
      {name: {'@type': 'string'}, boss: {'@type': '../fixtures/person'}},
      {directory: __dirname}
    );
    expect(Company.$getChild('name')).toBeInstanceOf(StringResource);
    expect(Company.$getChild('boss')).toBeInstanceOf(Resource);
    expect(Company.$getChild('boss').$getChild('name')).toBeInstanceOf(StringResource);
    expect(Company.$getChild('boss').$getChild('age')).toBeInstanceOf(NumberResource);
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
    await testSerialization({
      '@name': 'hello',
      '@aliases': ['hi', 'bonjour'],
      '@version': '1.2.3',
      '@description': 'This is a resource',
      '@authors': ['Manu', 'Vince'],
      '@repository': 'git://github.com/user/repo',
      '@license': 'MIT',
      '@files': ['./dist'],
      '@hidden': true
    });
    await testSerialization({'@author': 'Manu'});
    await testSerialization({color: {'@type': 'string'}});
    await testSerialization({color: 'green'});
    await testSerialization({name: 'Manu', address: {city: 'Tokyo'}});
    await testSerialization({'@type': {'@name': 'person', '@export': {name: 'anonymous'}}});
    await testSerialization({
      '@type': {'@name': 'person', '@export': {name: 'anonymous'}},
      name: 'Manu'
    });
    await testSerialization(
      {'@implementation': '../fixtures/person/index.js', '@runtime': 'node@>=6.10.0'},
      {directory: __dirname}
    );
  });

  test('customized normalization and serialization', async () => {
    const Person = await Resource.$import('../fixtures/person', {directory: __dirname});
    const person = await Person.$extend({address: {city: 'Paris', country: 'France'}});
    expect(person.address.city).toBe('Paris');
    expect(person.address.country).toBe('France');
    expect(person.$serialize()).toEqual({address: 'Paris, France'});
    await person.$setChild('address', 'Paris, France');
    expect(person.address.city).toBe('Paris');
    expect(person.address.country).toBe('France');
    expect(person.$serialize()).toEqual({address: 'Paris, France'});
    await person.$setChild('address', 'Tokyo');
    expect(person.address.city).toBe('Tokyo');
    expect(person.address.country).toBeUndefined();
    expect(person.$serialize()).toEqual({address: 'Tokyo'});
  });
});
