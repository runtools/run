import NumberResource from '../../../dist/resource/number';

describe('NumberResource', () => {
  test('creation', async () => {
    expect(await NumberResource.$create()).toBeInstanceOf(NumberResource);
    expect((await NumberResource.$create()).$value).toBeUndefined();
    expect((await NumberResource.$create({'@value': 0})).$value).toBe(0);
    expect((await NumberResource.$create({'@value': 1})).$value).toBe(1);
    expect((await NumberResource.$create({'@value': 123.45})).$value).toBe(123.45);
    expect((await NumberResource.$create(-789)).$value).toBe(-789);
    await expect(NumberResource.$create({'@value': 'hello'})).rejects.toBeInstanceOf(Error);
    await expect(NumberResource.$create('hello')).rejects.toBeInstanceOf(Error);
  });

  test('parsing', async () => {
    await expect(NumberResource.$create('123')).rejects.toBeInstanceOf(Error);
    expect((await NumberResource.$create('123', {parse: true})).$value).toBe(123);
    expect((await NumberResource.$create('0.999', {parse: true})).$value).toBe(0.999);
    expect((await NumberResource.$create('-3.333', {parse: true})).$value).toBe(-3.333);
    await expect(NumberResource.$create('', {parse: true})).rejects.toBeInstanceOf(Error);
    await expect(NumberResource.$create('two', {parse: true})).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await NumberResource.$create()).$serialize()).toBeUndefined();
    expect((await NumberResource.$create(123.45)).$serialize()).toBe(123.45);
  });
});
