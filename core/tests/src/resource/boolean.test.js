import BooleanResource from '../../../dist/resource/boolean';

describe('BooleanResource', () => {
  test('creation', async () => {
    expect(await BooleanResource.$create()).toBeInstanceOf(BooleanResource);
    expect((await BooleanResource.$create()).$value).toBeUndefined();
    expect((await BooleanResource.$create({'@value': false})).$value).toBe(false);
    expect((await BooleanResource.$create({'@value': true})).$value).toBe(true);
    expect((await BooleanResource.$create(true)).$value).toBe(true);
    await expect(BooleanResource.$create({'@value': 1})).rejects.toBeInstanceOf(Error);
    await expect(BooleanResource.$create(1)).rejects.toBeInstanceOf(Error);
  });

  test('default', async () => {
    expect((await BooleanResource.$create()).$default).toBeUndefined();
    expect((await BooleanResource.$create()).$value).toBeUndefined();
    expect((await BooleanResource.$create({'@default': false})).$default).toBe(false);
    expect((await BooleanResource.$create({'@default': false})).$value).toBe(false);
    expect((await BooleanResource.$create({'@value': true, '@default': false})).$default).toBe(false);
    expect((await BooleanResource.$create({'@value': true, '@default': false})).$value).toBe(true);
    await expect(BooleanResource.$create({'@default': 'yes'})).rejects.toBeInstanceOf(Error);
  });

  test('parsing', async () => {
    await expect(BooleanResource.$create('true')).rejects.toBeInstanceOf(Error);
    expect((await BooleanResource.$create('true', {parse: true})).$value).toBe(true);
    expect((await BooleanResource.$create('false', {parse: true})).$value).toBe(false);
    expect((await BooleanResource.$create('TRUE', {parse: true})).$value).toBe(true);
    expect((await BooleanResource.$create('1', {parse: true})).$value).toBe(true);
    expect((await BooleanResource.$create('yes', {parse: true})).$value).toBe(true);
    expect((await BooleanResource.$create('on', {parse: true})).$value).toBe(true);
    expect((await BooleanResource.$create('FALSE', {parse: true})).$value).toBe(false);
    expect((await BooleanResource.$create('0', {parse: true})).$value).toBe(false);
    expect((await BooleanResource.$create('no', {parse: true})).$value).toBe(false);
    expect((await BooleanResource.$create('off', {parse: true})).$value).toBe(false);
    await expect(BooleanResource.$create('', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(BooleanResource.$create('3', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(BooleanResource.$create('faux', {parse: true})).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await BooleanResource.$create()).$serialize()).toBeUndefined();
    expect((await BooleanResource.$create(false)).$serialize()).toBe(false);
    expect((await BooleanResource.$create(true)).$serialize()).toBe(true);
    expect((await BooleanResource.$create({'@default': false})).$serialize()).toEqual({
      '@default': false
    });
  });
});
