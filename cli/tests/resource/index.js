import Resource from '../../src/resource';

describe('Resource', () => {
  test('can be empty', () => {
    const res = new Resource();
    expect(res.$id).toBeUndefined();
    expect(res.$aliases).toBeUndefined();
    expect(res.$hasAlias('hi')).toBe(false);
  });

  test('can have parents', () => {
    const parent1 = new Resource({$id: 'parent1'});
    const parent2 = new Resource({$id: 'parent2'});
    const res = new Resource();
    res.$addParent(parent1);
    res.$addParent(parent2);
    const parents = [];
    res.$forEachParent(parent => parents.push(parent));
    expect(parents).toEqual([parent1, parent2]);
  });

  test('can create instances', () => {
    const parent1 = new Resource({$id: 'parent1'});
    const parent2 = new Resource({$id: 'parent2'});
    const res = parent1.$instantiate();
    expect(res.$isInstanceOf(parent1)).toBe(true);
    expect(res.$isInstanceOf(parent2)).toBe(false);
    const child = res.$instantiate();
    expect(child.$isInstanceOf(res)).toBe(true);
    expect(child.$isInstanceOf(parent1)).toBe(true);
    expect(child.$isInstanceOf(parent2)).toBe(false);
  });

  test('can have an id', () => {
    const res = new Resource({$id: 'hello'});
    expect(res.$id).toBe('hello');
    res.$id = 'bye';
    expect(res.$id).toBe('bye');
  });

  test('validates id', () => {
    expect(() => new Resource({$id: 'hello'})).not.toThrow();
    expect(() => new Resource({$id: ''})).toThrow();
    expect(() => new Resource({$id: 'hello*'})).toThrow();
  });

  test('can have aliases', () => {
    const res = new Resource({$aliases: ['hi']});
    expect(res.$hasAlias('hi')).toBe(true);
    expect(res.$hasAlias('bonjour')).toBe(false);
    res.$addAlias('bonjour');
    expect(res.$hasAlias('bonjour')).toBe(true);
  });

  test('is matchable by id or aliases', () => {
    const res = new Resource({$id: 'hello', $aliases: ['hi', 'bonjour']});
    expect(res.$isMatching('hello')).toBe(true);
    expect(res.$isMatching('hi')).toBe(true);
    expect(res.$isMatching('bonjour')).toBe(true);
    expect(res.$isMatching('bye')).toBe(false);
  });

  test('can have a version number', () => {
    expect(new Resource().$version).toBeUndefined();
    expect(new Resource({$version: '1.2.3'}).$version.toString()).toBe('1.2.3');
    expect(() => new Resource({$version: '1.2.3.4'})).toThrow();
  });

  test('can have a description', () => {
    expect(new Resource().$description).toBeUndefined();
    expect(new Resource({$description: 'This is a resource'}).$description).toBe(
      'This is a resource'
    );
  });

  test('can have authors', () => {
    expect(new Resource().$authors).toBeUndefined();
    expect(new Resource({$authors: 'Manu'}).$authors).toEqual(['Manu']);
    expect(new Resource({$authors: ['Manu', 'Paul']}).$authors).toEqual(['Manu', 'Paul']);
  });

  test('can have a repository', () => {
    expect(new Resource().$repository).toBeUndefined();
    expect(new Resource({$repository: 'git://github.com/user/repo'}).$repository).toBe(
      'git://github.com/user/repo'
    );
  });

  test('can have a license', () => {
    expect(new Resource().$license).toBeUndefined();
    expect(new Resource({$license: 'MIT'}).$license).toBe('MIT');
  });

  test('supports both singular and plural names for some properties', () => {
    const res1 = new Resource({$author: 'Manu'});
    expect(res1.$authors).toEqual(['Manu']);

    const res2 = new Resource({$authors: ['Manu', 'Vince']});
    expect(res2.$authors).toEqual(['Manu', 'Vince']);

    let error;
    try {
      const res3 = new Resource({$id: 'hello', $authors: 'Manu', $author: 'Manu'}); // eslint-disable-line no-unused-vars
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error).toBeInstanceOf(Error);
    expect(error.contextStack).toHaveLength(1);
    expect(error.contextStack[0]).toBeInstanceOf(Resource);
    expect(error.contextStack[0].$id).toBe('hello');
  });

  test('is serializable', () => {
    const res1 = new Resource({});
    expect(res1.$serialize()).toBeUndefined();
    const definition = {
      $id: 'hello',
      $aliases: ['hi', 'bonjour'],
      $version: '1.2.3',
      $description: 'This is a resource',
      $authors: ['Manu', 'Vince'],
      $repository: 'git://github.com/user/repo',
      $license: 'MIT'
    };
    const res2 = new Resource(definition);
    expect(res2.$serialize()).toEqual(definition);
    const res3 = new Resource({$author: 'Manu'});
    expect(res3.$serialize()).toEqual({$author: 'Manu'});
  });
});
