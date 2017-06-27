import Resource from '../src/resource';
import BooleanResource from '../src/primitives/boolean';
import NumberResource from '../src/primitives/number';
import StringResource from '../src/primitives/string';
import ArrayResource from '../src/primitives/array';
import ObjectResource from '../src/primitives/object';

describe('Resource', () => {
  test('creation', () => {
    expect(Resource.$create()).toBeInstanceOf(Resource);
    expect(Resource.$create({})).toBeInstanceOf(Resource);
    expect(Resource.$create({$type: 'resource'})).toBeInstanceOf(Resource);
    expect(Resource.$create({$types: ['resource']})).toBeInstanceOf(Resource);
    expect(() => Resource.$create({$type: 'invalid'})).toThrow();

    expect(Resource.$create({$type: 'boolean'})).toBeInstanceOf(BooleanResource);
    expect(Resource.$create(true)).toBeInstanceOf(BooleanResource);
    expect(Resource.$create({$value: false})).toBeInstanceOf(BooleanResource);

    expect(Resource.$create({$type: 'number'})).toBeInstanceOf(NumberResource);
    expect(Resource.$create(123.45)).toBeInstanceOf(NumberResource);
    expect(Resource.$create({$value: 0})).toBeInstanceOf(NumberResource);

    expect(Resource.$create({$type: 'string'})).toBeInstanceOf(StringResource);
    expect(Resource.$create('Hello')).toBeInstanceOf(StringResource);
    expect(Resource.$create({$value: ''})).toBeInstanceOf(StringResource);

    expect(Resource.$create({$type: 'array'})).toBeInstanceOf(ArrayResource);
    expect(Resource.$create([1])).toBeInstanceOf(ArrayResource);
    expect(Resource.$create({$value: []})).toBeInstanceOf(ArrayResource);

    expect(Resource.$create({$type: 'object'})).toBeInstanceOf(ObjectResource);
    expect(Resource.$create({$value: {}})).toBeInstanceOf(ObjectResource);
  });

  test('emptiness', () => {
    const res = Resource.$create();
    expect(res.$name).toBeUndefined();
    expect(res.$aliases).toBeUndefined();
    expect(res.$hasAlias('hi')).toBe(false);
  });

  test('name', () => {
    const res = Resource.$create();
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

  test('name validation', () => {
    expect(() => Resource.$create({$name: 'hello'})).not.toThrow();
    expect(() => Resource.$create({$name: 'runtools/hello'})).not.toThrow();
    expect(() => Resource.$create({$name: ''})).toThrow();
    expect(() => Resource.$create({$name: 'hello*'})).toThrow();
    expect(() => Resource.$create({$name: 'runtools/'})).toThrow();
    expect(() => Resource.$create({$name: '/hello'})).toThrow();
  });

  test('aliases', () => {
    const res = Resource.$create({$aliases: ['hi']});
    expect(res.$hasAlias('hi')).toBe(true);
    expect(res.$hasAlias('bonjour')).toBe(false);
    res.$addAlias('bonjour');
    expect(res.$hasAlias('bonjour')).toBe(true);
  });

  test('matching by name or aliases', () => {
    const res = Resource.$create({$name: 'hello', $aliases: ['hi', 'bonjour']});
    expect(res.$isMatching('hello')).toBe(true);
    expect(res.$isMatching('hi')).toBe(true);
    expect(res.$isMatching('bonjour')).toBe(true);
    expect(res.$isMatching('bye')).toBe(false);
  });

  test('version', () => {
    expect(Resource.$create().$version).toBeUndefined();
    expect(Resource.$create({$version: '1.2.3'}).$version.toString()).toBe('1.2.3');
    expect(() => Resource.$create({$version: '1.2.3.4'})).toThrow();
  });

  test('description', () => {
    expect(Resource.$create().$description).toBeUndefined();
    expect(Resource.$create({$description: 'This is a resource'}).$description).toBe(
      'This is a resource'
    );
  });

  test('authors', () => {
    expect(Resource.$create().$authors).toBeUndefined();
    expect(Resource.$create({$authors: 'Manu'}).$authors).toEqual(['Manu']);
    expect(Resource.$create({$authors: ['Manu', 'Paul']}).$authors).toEqual(['Manu', 'Paul']);
  });

  test('repository', () => {
    expect(Resource.$create().$repository).toBeUndefined();
    expect(Resource.$create({$repository: 'git://github.com/user/repo'}).$repository).toBe(
      'git://github.com/user/repo'
    );
  });

  test('license', () => {
    expect(Resource.$create().$license).toBeUndefined();
    expect(Resource.$create({$license: 'MIT'}).$license).toBe('MIT');
  });

  test('runtime', () => {
    expect(Resource.$create().$runtime).toBeUndefined();
    expect(Resource.$create({$runtime: 'node@>=6.10.0'}).$runtime.toJSON()).toBe('node@>=6.10.0');
  });

  test('implementation', () => {
    expect(Resource.$create().$implementation).toBeUndefined();
    expect(
      Resource.$create({$implementation: './fixtures/person/index.js'}, {directory: __dirname})
        .$implementation
    ).toBe('./fixtures/person/index.js');
  });

  test('singular and plural property names', () => {
    const res1 = Resource.$create({$author: 'Manu'});
    expect(res1.$authors).toEqual(['Manu']);

    const res2 = Resource.$create({$authors: ['Manu', 'Vince']});
    expect(res2.$authors).toEqual(['Manu', 'Vince']);

    let error;
    try {
      const res3 = Resource.$create({$name: 'hello', $authors: 'Manu', $author: 'Manu'}); // eslint-disable-line no-unused-vars
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(Error);
    expect(error.contextStack).toHaveLength(1);
    expect(error.contextStack[0]).toBeInstanceOf(Resource);
    expect(error.contextStack[0].$name).toBe('hello');
  });

  test('simple property definition', () => {
    const person = Resource.$create({name: {$type: 'string', $value: 'Manu'}});
    expect(person.$get('name')).toBeDefined();
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
  });

  test('properties defined from literals', () => {
    const person = Resource.$create({name: 'Manu', age: 44, address: {city: 'London'}});
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$get('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
    expect(person.$get('address')).toBeInstanceOf(Resource);
    expect(person.$get('address')).toBe(person.address);
    expect(person.address.city).toBe('London');
  });

  test('properties redefined', () => {
    const person = Resource.$create({
      name: {$type: 'string', $description: 'Name', $value: 'Manu'}
    });
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$get('name').$description).toBe('Name');
    person.$set('name', 'Manuel');
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manuel');
    expect(person.$get('name').$description).toBeUndefined();
    person.$set('name', {$value: 'mvila', $description: 'The name'});
    expect(person.name).toBe('mvila');
    expect(person.$get('name').$description).toBe('The name');
    person.$set('name', 123); // Since there is no parent, we can change the type
    expect(person.$get('name')).toBeInstanceOf(NumberResource);
    expect(person.name).toBe(123);
  });

  test('composed properties', () => {
    const person = Resource.$create({address: {$type: {city: {$type: 'string'}}}});
    expect(person.address).toBeInstanceOf(Resource);
    expect(person.address.$get('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
  });

  test('inherited properties', () => {
    const person = Resource.$create({$type: {name: 'anonymous'}});
    const parent = person.$findParent(() => true);
    expect(parent.$get('name')).toBeInstanceOf(StringResource);
    expect(parent.name).toBe('anonymous');
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('anonymous');
    person.name = 'Manu';
    expect(person.name).toBe('Manu');
    expect(parent.name).toBe('anonymous');
  });

  test('inherited properties redefined', () => {
    const person = Resource.$create({$type: {name: 'anonymous'}});
    const parent = person.$findParent(() => true);
    person.$set('name', 'Manuel');
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
    // Setting a type incompatible with the parent type throws an error
    expect(() => person.$set('name', 123)).toThrow();
  });

  test('inherited properties with a value', () => {
    const person = Resource.$create({$type: {name: 'anonymous'}, name: 'Manu'});
    const parent = person.$findParent(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
  });

  test('inherited composed properties', () => {
    const person = Resource.$create({$type: {address: {$type: {city: 'unknown'}}}});
    const parent = person.$findParent(() => true);
    expect(parent.address.city).toBe('unknown');
    expect(person.address.city).toBe('unknown');
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    expect(parent.address.city).toBe('unknown');
  });

  test('inherited composed properties with a value', () => {
    const person = Resource.$create({
      $type: {address: {$type: {city: {$value: 'unknown', $description: 'The city'}}}},
      address: {city: 'Tokyo'}
    });
    const parent = person.$findParent(() => true);
    expect(parent.address.city).toBe('unknown');
    expect(parent.address.$get('city').$description).toBe('The city');
    expect(person.address.city).toBe('Tokyo');
    expect(person.address.$get('city').$description).toBe('The city');
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    expect(parent.address.city).toBe('unknown');
    person.address.$get('city').$description = 'La ville';
    expect(person.address.$get('city').$description).toBe('La ville');
    expect(parent.address.$get('city').$description).toBe('The city');
  });

  test('Resource loaded from a file', () => {
    const Person = Resource.$load('./fixtures/person', {directory: __dirname});
    expect(Person).toBeInstanceOf(Resource);
    expect(Person.$name).toBe('person');
    expect(Person.$version.toString()).toBe('1.0.0');
    expect(Person.$get('name')).toBeInstanceOf(StringResource);
    expect(Person.name).toBeUndefined();
    expect(Person.$get('age')).toBeInstanceOf(NumberResource);
    expect(Person.age).toBeUndefined();

    const person = Resource.$load('./fixtures/person-instance', {directory: __dirname});
    expect(person).toBeInstanceOf(Resource);
    expect(Person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(Person.$get('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
  });

  test('Resource loaded from a type', () => {
    const person = Resource.$create(
      {$name: 'manu', $type: './fixtures/person'},
      {directory: __dirname}
    );
    expect(person.$name).toBe('manu');
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.$get('age')).toBeInstanceOf(NumberResource);
    person.name = 'Manu';
    person.age = 44;
    expect(person.$serialize()).toEqual({
      $name: 'manu',
      $type: './fixtures/person',
      name: 'Manu',
      age: 44
    });
  });

  test('Resource loaded from a property', () => {
    const Company = Resource.$create(
      {name: {$type: 'string'}, boss: {$type: './fixtures/person'}},
      {directory: __dirname}
    );
    expect(Company.$get('name')).toBeInstanceOf(StringResource);
    expect(Company.$get('boss')).toBeInstanceOf(Resource);
    expect(Company.$get('boss').$get('name')).toBeInstanceOf(StringResource);
    expect(Company.$get('boss').$get('age')).toBeInstanceOf(NumberResource);
  });

  test('serialization', () => {
    function testSerialization(definition, options, expected) {
      if (arguments.length < 3) {
        expected = definition;
      }
      const resource = Resource.$create(definition, options);
      expect(resource.$serialize()).toEqual(expected);
    }
    testSerialization(undefined, undefined, undefined);
    testSerialization({}, undefined, undefined);
    testSerialization({$type: 'resource'});
    testSerialization({
      $name: 'hello',
      $aliases: ['hi', 'bonjour'],
      $version: '1.2.3',
      $description: 'This is a resource',
      $authors: ['Manu', 'Vince'],
      $repository: 'git://github.com/user/repo',
      $license: 'MIT'
    });
    testSerialization({$author: 'Manu'});
    testSerialization({color: {$type: 'string'}});
    testSerialization({color: 'green'});
    testSerialization({name: 'Manu', address: {city: 'Tokyo'}});
    testSerialization({$type: {$name: 'person', name: 'anonymous'}});
    testSerialization({$type: {$name: 'person', name: 'anonymous'}, name: 'Manu'});
    testSerialization(
      {$implementation: './fixtures/person/index.js', $runtime: 'node@>=6.10.0'},
      {directory: __dirname}
    );
  });

  test('customized normalization and serialization', () => {
    const Person = Resource.$load('./fixtures/person', {directory: __dirname});
    const person = Person.$create({address: {city: 'Paris', country: 'France'}});
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
});
