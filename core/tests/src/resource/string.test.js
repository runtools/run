import Resource from '../../../..';

describe('StringResource', () => {
  test('creation', async () => {
    expect((await Resource.$create({'@type': 'string'})).$getType()).toBe('string');
    expect((await Resource.$create({'@value': ''})).$getType()).toBe('string');
    expect((await Resource.$create({'@type': 'string'})).$value).toBeUndefined();
    expect((await Resource.$create({'@value': ''})).$value).toBe('');
    expect((await Resource.$create({'@value': 'green'})).$value).toBe('green');
    expect((await Resource.$create('blue')).$value).toBe('blue');
    await expect(Resource.$create({'@type': 'string', '@value': 123})).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await Resource.$create({'@type': 'string'})).$default).toBeUndefined();
    expect((await Resource.$create({'@type': 'string'})).$value).toBeUndefined();
    expect((await Resource.$create({'@default': 'black'})).$default).toBe('black');
    expect((await Resource.$create({'@default': 'black'})).$value).toBe('black');
    expect((await Resource.$create({'@value': 'green', '@default': 'black'})).$default).toBe('black');
    expect((await Resource.$create({'@value': 'green', '@default': 'black'})).$value).toBe('green');
    await expect(Resource.$create({'@type': 'string', '@default': 123})).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await Resource.$create({'@type': 'string'})).$serialize()).toEqual({
      '@type': 'string'
    });
    expect((await Resource.$create('green')).$serialize()).toBe('green');
    expect((await Resource.$create({'@value': 'green'})).$serialize()).toBe('green');
    expect((await Resource.$create({'@default': 'black'})).$serialize()).toEqual({
      '@default': 'black'
    });
  });
});
