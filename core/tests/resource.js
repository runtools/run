import {createResource} from '../src';
import Resource from '../src/resource';
import StringResource from '../src/primitives/string';
import NumberResource from '../src/primitives/number';

describe('Resource', () => {
  test('emptiness', () => {
    const res = new Resource();
    expect(res.$name).toBeUndefined();
    expect(res.$aliases).toBeUndefined();
    expect(res.$hasAlias('hi')).toBe(false);
  });

  test('$inherit', () => {
    const parent1 = new Resource({$name: 'parent1'});
    const parent2 = new Resource({$name: 'parent2'});
    const res = new Resource();
    res.$inherit(parent1);
    res.$inherit(parent2);
    const parents = [];
    res.$forEachParent(parent => parents.push(parent));
    expect(parents).toEqual([parent1, parent2]);
  });

  test('$instantiate', () => {
    const parent1 = new Resource({$name: 'parent1'});
    const parent2 = new Resource({$name: 'parent2'});
    const res = parent1.$instantiate();
    expect(res.$isInstanceOf(parent1)).toBe(true);
    expect(res.$isInstanceOf(parent2)).toBe(false);
    const child = res.$instantiate();
    expect(child.$isInstanceOf(res)).toBe(true);
    expect(child.$isInstanceOf(parent1)).toBe(true);
    expect(child.$isInstanceOf(parent2)).toBe(false);
  });

  test('name', () => {
    const res = new Resource();
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
    expect(() => new Resource({$name: 'hello'})).not.toThrow();
    expect(() => new Resource({$name: 'runtools/hello'})).not.toThrow();
    expect(() => new Resource({$name: ''})).toThrow();
    expect(() => new Resource({$name: 'hello*'})).toThrow();
    expect(() => new Resource({$name: 'runtools/'})).toThrow();
    expect(() => new Resource({$name: '/hello'})).toThrow();
  });

  test('aliases', () => {
    const res = new Resource({$aliases: ['hi']});
    expect(res.$hasAlias('hi')).toBe(true);
    expect(res.$hasAlias('bonjour')).toBe(false);
    res.$addAlias('bonjour');
    expect(res.$hasAlias('bonjour')).toBe(true);
  });

  test('matching by name or aliases', () => {
    const res = new Resource({$name: 'hello', $aliases: ['hi', 'bonjour']});
    expect(res.$isMatching('hello')).toBe(true);
    expect(res.$isMatching('hi')).toBe(true);
    expect(res.$isMatching('bonjour')).toBe(true);
    expect(res.$isMatching('bye')).toBe(false);
  });

  test('version', () => {
    expect(new Resource().$version).toBeUndefined();
    expect(new Resource({$version: '1.2.3'}).$version.toString()).toBe('1.2.3');
    expect(() => new Resource({$version: '1.2.3.4'})).toThrow();
  });

  test('description', () => {
    expect(new Resource().$description).toBeUndefined();
    expect(new Resource({$description: 'This is a resource'}).$description).toBe(
      'This is a resource'
    );
  });

  test('authors', () => {
    expect(new Resource().$authors).toBeUndefined();
    expect(new Resource({$authors: 'Manu'}).$authors).toEqual(['Manu']);
    expect(new Resource({$authors: ['Manu', 'Paul']}).$authors).toEqual(['Manu', 'Paul']);
  });

  test('repository', () => {
    expect(new Resource().$repository).toBeUndefined();
    expect(new Resource({$repository: 'git://github.com/user/repo'}).$repository).toBe(
      'git://github.com/user/repo'
    );
  });

  test('license', () => {
    expect(new Resource().$license).toBeUndefined();
    expect(new Resource({$license: 'MIT'}).$license).toBe('MIT');
  });

  test('runtime', () => {
    expect(new Resource().$runtime).toBeUndefined();
    expect(new Resource({$runtime: 'node@>=6.10.0'}).$runtime.toJSON()).toBe('node@>=6.10.0');
  });

  test('implementation', () => {
    expect(new Resource().$implementation).toBeUndefined();
    expect(new Resource({$implementation: './fixtures/person/index.js'}).$implementation).toBe(
      './fixtures/person/index.js'
    );
  });

  test('singular and plural property names', () => {
    const res1 = new Resource({$author: 'Manu'});
    expect(res1.$authors).toEqual(['Manu']);

    const res2 = new Resource({$authors: ['Manu', 'Vince']});
    expect(res2.$authors).toEqual(['Manu', 'Vince']);

    let error;
    try {
      const res3 = new Resource({$name: 'hello', $authors: 'Manu', $author: 'Manu'}); // eslint-disable-line no-unused-vars
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
    const person = createResource({name: {$type: 'string', $value: 'Manu'}});
    expect(person.$get('name')).toBeDefined();
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
  });

  test('properties defined from literals', () => {
    const person = createResource({name: 'Manu', age: 44, address: {city: 'London'}});
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('Manu');
    expect(person.$get('age')).toBeInstanceOf(NumberResource);
    expect(person.age).toBe(44);
    expect(person.$get('address')).toBeInstanceOf(Resource);
    expect(person.$get('address')).toBe(person.address);
    expect(person.address.city).toBe('London');
  });

  test('composed properties', () => {
    const person = createResource({address: {$type: {city: {$type: 'string'}}}});
    expect(person.address).toBeDefined();
    expect(person.address).toBeInstanceOf(Resource);
    expect(person.address.$get('city')).toBeDefined();
    expect(person.address.city).toBeUndefined();
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
  });

  test('inherited properties', () => {
    const person = createResource({$type: {name: 'anonymous'}});
    const parent = person.$findParent(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.$get('name')).toBeDefined();
    expect(person.$get('name')).toBeInstanceOf(StringResource);
    expect(person.name).toBe('anonymous');
    person.name = 'Manu';
    expect(person.name).toBe('Manu');
    expect(parent.name).toBe('anonymous');
  });

  test('inherited properties with a value', () => {
    const person = createResource({$type: {name: 'anonymous'}, name: 'Manu'});
    const parent = person.$findParent(() => true);
    expect(parent.name).toBe('anonymous');
    expect(person.name).toBe('Manu');
    person.name = 'Manuel';
    expect(person.name).toBe('Manuel');
    expect(parent.name).toBe('anonymous');
  });

  test('inherited composed properties', () => {
    const person = createResource({$type: {address: {$type: {city: 'unknown'}}}});
    const parent = person.$findParent(() => true);
    expect(parent.address.city).toBe('unknown');
    expect(person.address.city).toBe('unknown');
    person.address.city = 'Paris';
    expect(person.address.city).toBe('Paris');
    expect(parent.address.city).toBe('unknown');
  });

  test('inherited composed properties with a value', () => {
    const person = createResource({
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

  test('serialization', () => {
    function testSerialization(definition, options, expected) {
      if (arguments.length < 3) expected = definition;
      const resource = createResource(definition, options);
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
});
