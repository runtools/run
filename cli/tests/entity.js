import Entity from '../src/entity';

describe('Entity', () => {
  test('can be empty', () => {
    const entity = new Entity();
    expect(entity.name).toBeUndefined();
    expect(entity.aliases).toBeUndefined();
    expect(entity.hasAlias('hi')).toBe(false);
  });

  test('can have a name', () => {
    const entity = new Entity({name: 'hello'});
    expect(entity.name).toBe('hello');
    entity.name = 'bye';
    expect(entity.name).toBe('bye');
  });

  test('should trim name', () => {
    const entity = new Entity({name: '  hello   '});
    expect(entity.name).toBe('hello');
  });

  test('provides an identifier', () => {
    expect(new Entity().toIdentifier()).toBe('anonymous');
    expect(new Entity({name: 'hello'}).toIdentifier()).toBe('hello');
  });

  test('cannot have an empty name', () => {
    expect(() => new Entity({name: ''})).toThrow();
    expect(() => new Entity({name: ' '})).toThrow();
  });

  test('can have aliases', () => {
    const entity = new Entity({name: 'hello', aliases: ['hi']});
    expect(entity.name).toBe('hello');
    expect(entity.aliases).toEqual(['hi']);
    expect(entity.hasAlias('hi')).toBe(true);
    expect(entity.hasAlias('bonjour')).toBe(false);
    entity.addAlias('bonjour');
    expect(entity.aliases).toEqual(['hi', 'bonjour']);
    expect(entity.hasAlias('bonjour')).toBe(true);
  });

  test('is matchable by name or aliases', () => {
    const entity = new Entity({name: 'hello', aliases: ['hi']});
    expect(entity.isMatching('hello')).toBe(true);
    expect(entity.isMatching('hi')).toBe(true);
    expect(entity.isMatching('bonjour')).toBe(false);
  });

  test('is matchable by name or aliases', () => {
    const entity = new Entity({name: 'hello', aliases: ['hi', 'bonjour']});
    expect(entity.isMatching('hello')).toBe(true);
    expect(entity.isMatching('hi')).toBe(true);
    expect(entity.isMatching('bonjour')).toBe(true);
    expect(entity.isMatching('bye')).toBe(false);
  });

  test('validates name', () => {
    expect(() => new Entity({name: 'hello'})).not.toThrow();
    expect(() => new Entity({name: 'hello*'})).toThrow();
  });

  test('avoids common mistakes', () => {
    let error;
    try {
      const entity = new Entity({name: 'hello', alias: ['hi']}); // eslint-disable-line no-unused-vars
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.contextStack).toHaveLength(1);
    expect(error.contextStack[0]).toBeInstanceOf(Entity);
    expect(error.contextStack[0].name).toBe('hello');
  });

  test('is serializable', () => {
    const entity = new Entity({name: 'hello', aliases: ['hi', 'bonjour']});
    expect(entity.toJSON()).toEqual({name: 'hello', aliases: ['hi', 'bonjour']});
    const empty = new Entity({});
    expect(empty.toJSON()).toEqual({});
  });
});
