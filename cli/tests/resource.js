import Resource from '../src/resource';

describe('Resource', () => {
  test('can have a version', () => {
    expect(new Resource().version).toBeUndefined();
    expect(new Resource({version: '1.2.3'}).version.toString()).toBe('1.2.3');
    expect(() => new Resource({version: '1.2.3.4'})).toThrow();
  });

  test('can have a description', () => {
    expect(new Resource().description).toBeUndefined();
    expect(new Resource({description: 'This is a resource'}).description).toBe(
      'This is a resource'
    );
  });

  test('can have authors', () => {
    expect(new Resource().authors).toBeUndefined();
    expect(new Resource({authors: []}).authors).toBeUndefined();
    expect(new Resource({authors: 'Manu'}).authors).toEqual(['Manu']);
    expect(new Resource({authors: ['Manu', 'Paul']}).authors).toEqual(['Manu', 'Paul']);
  });

  test('can have a repository', () => {
    expect(new Resource().repository).toBeUndefined();
    expect(new Resource({repository: 'git://github.com/user/repo'}).repository).toBe(
      'git://github.com/user/repo'
    );
  });

  test('can have a license', () => {
    expect(new Resource().license).toBeUndefined();
    expect(new Resource({license: 'MIT'}).license).toBe('MIT');
  });

  test('is serializable', () => {
    // TODO
  });
});
