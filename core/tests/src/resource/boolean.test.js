import Resource from '../../../..';

describe('BooleanResource', () => {
  test('creation', async () => {
    expect((await Resource.$create({'@type': 'boolean'})).$getType()).toBe('boolean');
    expect((await Resource.$create({'@type': 'boolean'})).$value).toBeUndefined();
    expect((await Resource.$create({'@value': false})).$value).toBe(false);
    expect((await Resource.$create({'@value': true})).$value).toBe(true);
    expect((await Resource.$create(true)).$value).toBe(true);
    await expect(Resource.$create({'@type': 'boolean', '@value': 1})).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await Resource.$create({'@type': 'boolean'})).$default).toBeUndefined();
    expect((await Resource.$create({'@type': 'boolean'})).$value).toBeUndefined();
    expect((await Resource.$create({'@default': false})).$default).toBe(false);
    expect((await Resource.$create({'@default': false})).$value).toBe(false);
    expect((await Resource.$create({'@value': true, '@default': false})).$default).toBe(false);
    expect((await Resource.$create({'@value': true, '@default': false})).$value).toBe(true);
    await expect(Resource.$create({'@type': 'boolean', '@default': 'yes'})).rejects.toBeInstanceOf(Error);
  });

  test('parsing', async () => {
    const boolean = await Resource.$create({'@type': 'boolean'});
    await expect(boolean.$extend('true', {parse: false})).rejects.toBeInstanceOf(Error);
    expect((await boolean.$extend('true', {parse: true})).$value).toBe(true);
    expect((await boolean.$extend('false', {parse: true})).$value).toBe(false);
    expect((await boolean.$extend('TRUE', {parse: true})).$value).toBe(true);
    expect((await boolean.$extend('1', {parse: true})).$value).toBe(true);
    expect((await boolean.$extend('yes', {parse: true})).$value).toBe(true);
    expect((await boolean.$extend('on', {parse: true})).$value).toBe(true);
    expect((await boolean.$extend('FALSE', {parse: true})).$value).toBe(false);
    expect((await boolean.$extend('0', {parse: true})).$value).toBe(false);
    expect((await boolean.$extend('no', {parse: true})).$value).toBe(false);
    expect((await boolean.$extend('off', {parse: true})).$value).toBe(false);
    await expect(boolean.$extend('', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(boolean.$extend('3', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(boolean.$extend('faux', {parse: true})).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await Resource.$create(false)).$serialize()).toBe(false);
    expect((await Resource.$create(true)).$serialize()).toBe(true);
    expect((await Resource.$create({'@default': false})).$serialize()).toEqual({
      '@default': false
    });
  });
});
