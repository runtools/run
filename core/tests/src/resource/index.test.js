import Resource from '../../../dist/cjs/resource';

describe('Resource', () => {
  test('creation', async () => {
    expect((await Resource.$create()).$getType()).toBe('resource');
    expect((await Resource.$create({})).$getType()).toBe('resource');
    expect((await Resource.$create({'@type': 'resource'})).$getType()).toBe('resource');
    await expect(Resource.$create({'@type': 'invalid'})).rejects.toBeInstanceOf(Error);
  });

  test('@comment', async () => {
    expect((await Resource.$create()).$comment).toBeUndefined();
    expect((await Resource.$create({'@comment': 'This is a comment'})).$comment).toBe('This is a comment');
  });

  test('@aliases', async () => {
    const res = await Resource.$create();
    expect(res.$aliases).toBeUndefined();
    expect(res.$hasAlias('hi')).toBe(false);

    const res2 = await Resource.$create({'@aliases': ['hi']});
    expect(res2.$hasAlias('hi')).toBe(true);
    expect(res2.$hasAlias('bonjour')).toBe(false);
    res2.$addAlias('bonjour');
    expect(res2.$hasAlias('bonjour')).toBe(true);

    const res3 = await Resource.$create();
    expect(() => res3.$addAlias('1')).toThrow();
    expect(() => res3.$addAlias('a-')).toThrow();
    expect(() => res3.$addAlias('')).toThrow();
  });

  test('@description', async () => {
    expect((await Resource.$create()).$description).toBeUndefined();
    expect((await Resource.$create({'@description': 'This is a resource'})).$description).toBe('This is a resource');
  });

  test('@examples', async () => {
    expect((await Resource.$create()).$examples).toBeUndefined();
    expect((await Resource.$create({'@examples': ['aturing/nice-tool']})).$examples).toEqual([
      'aturing/nice-tool'
    ]);
    expect((await Resource.$create({'@examples': 'aturing/nice-tool'})).$examples).toEqual([
      'aturing/nice-tool'
    ]);
  });

  test('@runtime', async () => {
    expect((await Resource.$create()).$runtime).toBeUndefined();
    expect((await Resource.$create({'@runtime': 'node#>=6.10.0'})).$runtime.toJSON()).toBe('node#>=6.10.0');
  });

  test('@implementation', async () => {
    expect((await Resource.$create()).$implementation).toBeUndefined();
    expect((await Resource.$create(
      {'@implementation': '../../fixtures/person/index.js'},
      {directory: __dirname}
    )).$implementation).toBe('../../fixtures/person/index.js');
  });

  test('@isHidden', async () => {
    expect((await Resource.$create()).$isHidden).toBeUndefined();
    expect((await Resource.$create({'@isHidden': false})).$isHidden).toBe(false);
    expect((await Resource.$create({'@isHidden': true})).$isHidden).toBe(true);
  });

  test('@isOpen', async () => {
    expect((await Resource.$create()).$isOpen).toBe(true);
    expect((await Resource.$create({'@isOpen': false})).$isOpen).toBe(false);
    expect((await Resource.$create({'@isOpen': true})).$isOpen).toBe(true);
  });

  test('simple property definition', async () => {
    const person = await Resource.$create({name: {'@type': 'string', '@value': 'Manu'}});
    expect(person.$getChild('name')).toBeDefined();
    expect(person.$getChild('name').$getType()).toBe('string');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');

    await expect(Resource.$create({'1invalidKey': 'value'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'invalid-key': 'value'})).rejects.toBeInstanceOf(Error);
    await expect(Resource.$create({'@invalidKey': 'value'})).rejects.toBeInstanceOf(Error);

    expect((await Resource.$create({'@nativeKey': 'value'}, {isNative: true})).$getType()).toBe('resource');
  });

  test('properties defined from literals', async () => {
    const person = await Resource.$create({name: 'Manu', age: 44, address: {city: 'London'}});
    expect(person.$getChild('name').$getType()).toBe('string');
    expect(person.name).toBe('Manu');
    expect(person.$getChild('age').$getType()).toBe('number');
    expect(person.age).toBe(44);
    expect(person.$getChild('address').$getType()).toBe('resource');
    expect(person.$getChild('address')).toBe(person.address);
    expect(person.address.city).toBe('London');
  });

  test('properties redefined', async () => {
    const person = await Resource.$create({
      name: {'@type': 'string', '@description': 'Name', '@value': 'Manu'}
    });
    expect(person.$getChild('name').$getType()).toBe('string');
    expect(person.name).toBe('Manu');
    expect(person.$getChild('name').$description).toBe('Name');
    await person.$setChild('name', 'Manuel');
    expect(person.$getChild('name').$getType()).toBe('string');
    expect(person.name).toBe('Manuel');
    expect(person.$getChild('name').$description).toBeUndefined();
    await person.$setChild('name', {'@value': 'mvila', '@description': 'The name'});
    expect(person.name).toBe('mvila');
    expect(person.$getChild('name').$description).toBe('The name');
    await person.$setChild('name', 123); // Since there is no parent, we can change the type
    expect(person.$getChild('name').$getType()).toBe('number');
    expect(person.name).toBe(123);
  });

  test('composed properties', async () => {
    const definition = {'@export': {city: {'@type': 'string'}}};
    const person = await Resource.$create({address: {'@import': definition}});
    expect(person.address.$getType()).toBe('resource');
    expect(person.address.$getChild('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
  });

  test('inherited properties', async () => {
    const definition = {'@export': {name: 'anonymous'}};
    const person = await Resource.$create({'@import': definition});
    const parent = person.$findBase(() => true);
    expect(parent.$getChild('name').$getType()).toBe('string');
    expect(parent.name).toBe('anonymous');
    expect(person.$getChild('name').$getType()).toBe('string');
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
    expect(person.$getChild('name').$getType()).toBe('string');
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
        address: {'@import': {'@export': {city: {'@value': 'unknown', '@description': 'The city'}}}}
      }
    };
    const person = await Resource.$create({
      '@import': definition,
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

  test('resource loaded from a file', async () => {
    const PersonConstructor = await Resource.$load('../../fixtures/person', {directory: __dirname});
    expect(PersonConstructor.$getType()).toBe('resource');
    expect(PersonConstructor.$getChild('name')).toBeUndefined();
    expect(PersonConstructor.$getChild('age')).toBeUndefined();

    const person = await Resource.$load('../../fixtures/person-instance', {directory: __dirname});
    expect(person.$getType()).toBe('resource');
    expect(person.$getChild('name').$getType()).toBe('string');
    expect(person.name).toBe('Manu');
    expect(person.$getChild('age').$getType()).toBe('number');
    expect(person.age).toBe(44);
  });

  test('resource loaded from a file via a @load attribute', async () => {
    const person = await Resource.$create(
      {'@load': '../../fixtures/person-instance'},
      {directory: __dirname}
    );
    expect(person.$getChild('name').$getType()).toBe('string');
    expect(person.name).toBe('Manu');
    expect(person.$getChild('age').$getType()).toBe('number');
    expect(person.age).toBe(44);
  });

  test('resource imported from a file', async () => {
    const Person = await Resource.$import('../../fixtures/person', {directory: __dirname});
    expect(Person.$getType()).toBe('resource');
    expect(Person.$getChild('name').$getType()).toBe('string');
    expect(Person.name).toBeUndefined();
    expect(Person.$getChild('age').$getType()).toBe('number');
    expect(Person.age).toBeUndefined();
  });

  test('resource imported from a file via an @import attribute', async () => {
    const person = await Resource.$create(
      {'@import': '../../fixtures/person'},
      {directory: __dirname}
    );
    expect(person.$getChild('name').$getType()).toBe('string');
    expect(person.$getChild('age').$getType()).toBe('number');
    person.name = 'Manu';
    person.age = 44;
    expect(person.$serialize()).toEqual({
      '@import': '../../fixtures/person',
      name: 'Manu',
      age: 44
    });
  });

  test('sub-resource imported from a file via an @import property', async () => {
    const Company = await Resource.$create(
      {name: {'@type': 'string'}, boss: {'@import': '../../fixtures/person'}},
      {directory: __dirname}
    );
    expect(Company.$getChild('name').$getType()).toBe('string');
    expect(Company.$getChild('boss').$getType()).toBe('resource');
    expect(Company.$getChild('boss')
      .$getChild('name')
      .$getType()).toBe('string');
    expect(Company.$getChild('boss')
      .$getChild('age')
      .$getType()).toBe('number');
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
    expect(personWithMixin.$getChild('name').$getType()).toBe('string');
    expect(personWithMixin.name).toBe('Manu');
    expect(personWithMixin.$getChild('mixinProperty').$getType()).toBe('string');
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
      '@comment': 'This is a comment',
      '@aliases': ['hi', 'bonjour'],
      '@description': 'This is a resource',
      '@examples': ['aturing/nice-tool', 'resdir/hello'],
      '@isHidden': true
    });
    await testSerialization({color: {'@type': 'string'}});
    await testSerialization({color: 'green'});
    await testSerialization({name: 'Manu', address: {city: 'Tokyo'}});
    await testSerialization(
      {'@import': '../../fixtures/person'},
      {directory: __dirname},
      {'@import': '../../fixtures/person'}
    );
    await testSerialization(
      {'@import': ['../../fixtures/person', '../../fixtures/mixin']},
      {directory: __dirname},
      {'@import': ['../../fixtures/person', '../../fixtures/mixin']}
    );
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
