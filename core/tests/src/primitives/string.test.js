import StringResource from '../../../dist/primitives/string';

describe('StringResource', () => {
  test('creation', async () => {
    expect(await StringResource.$create()).toBeInstanceOf(StringResource);
    expect((await StringResource.$create()).$value).toBeUndefined();
    expect((await StringResource.$create({'@value': ''})).$value).toBe('');
    expect((await StringResource.$create({'@value': 'green'})).$value).toBe('green');
    expect((await StringResource.$create('blue')).$value).toBe('blue');
    await expect(StringResource.$create({'@value': 123})).rejects.toBeInstanceOf(Error);
    await expect(StringResource.$create(123)).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await StringResource.$create()).$serialize()).toBeUndefined();
    expect((await StringResource.$create({'@name': 'run/color-test'})).$serialize()).toEqual({
      '@name': 'run/color-test'
    });
    expect(
      (await StringResource.$create({'@name': 'run/color-test', '@value': 'green'})).$serialize()
    ).toEqual({
      '@name': 'run/color-test',
      '@value': 'green'
    });
    expect((await StringResource.$create({'@value': 'green'})).$serialize()).toBe('green');
  });
});
