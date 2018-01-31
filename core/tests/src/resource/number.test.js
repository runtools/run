import Resource from '../../../..';

describe('NumberResource', () => {
  test('creation', async () => {
    expect((await Resource.$create({'@type': 'number'})).$getType()).toBe('number');
    expect((await Resource.$create({'@type': 'number'})).$value).toBeUndefined();
    expect((await Resource.$create({'@value': 0})).$value).toBe(0);
    expect((await Resource.$create({'@value': 1})).$value).toBe(1);
    expect((await Resource.$create({'@value': 123.45})).$value).toBe(123.45);
    expect((await Resource.$create(-789)).$value).toBe(-789);
    await expect(Resource.$create({'@type': 'number', '@value': 'hello'})).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await Resource.$create({'@type': 'number'})).$default).toBeUndefined();
    expect((await Resource.$create({'@type': 'number'})).$value).toBeUndefined();
    expect((await Resource.$create({'@default': 0})).$default).toBe(0);
    expect((await Resource.$create({'@default': 0})).$value).toBe(0);
    expect((await Resource.$create({'@value': 1, '@default': 0})).$default).toBe(0);
    expect((await Resource.$create({'@value': 1, '@default': 0})).$value).toBe(1);
    await expect(Resource.$create({'@type': 'number', '@default': 'hi'})).rejects.toBeInstanceOf(Error);
  });

  test('parsing', async () => {
    const number = await Resource.$create({'@type': 'number'});
    await expect(number.$extend('123')).rejects.toBeInstanceOf(Error);
    expect((await number.$extend('123', {parse: true})).$value).toBe(123);
    expect((await number.$extend('0.999', {parse: true})).$value).toBe(0.999);
    expect((await number.$extend('-3.333', {parse: true})).$value).toBe(-3.333);
    await expect(number.$extend('', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(number.$extend('two', {parse: true})).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await Resource.$create({'@type': 'number'})).$serialize()).toEqual({'@type': 'number'});
    expect((await Resource.$create(123.45)).$serialize()).toBe(123.45);
    expect((await Resource.$create({'@value': 123.45})).$serialize()).toBe(123.45);
    expect((await Resource.$create({'@default': 0})).$serialize()).toEqual({'@default': 0});
  });
});
