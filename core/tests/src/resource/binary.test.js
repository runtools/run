import Resource from '../../../..';

describe('BinaryResource', () => {
  test('creation', async () => {
    expect((await Resource.$create({'@type': 'binary'})).$getType()).toBe('binary');
    expect((await Resource.$create({'@type': 'binary'})).$value).toBeUndefined();
    expect(Buffer.isBuffer((await Resource.$create({'@value': Buffer.alloc(0)})).$value)).toBe(
      true
    );
    expect((await Resource.$create({'@value': Buffer.alloc(0)})).$value.length).toBe(0);
    expect((await Resource.$create({'@value': Buffer.from([1, 2, 3])})).$value.toJSON()).toEqual({
      type: 'Buffer',
      data: [1, 2, 3]
    });
    expect(
      (await Resource.$create({'@type': 'binary', '@value': 'data:;base64,'})).$value.length
    ).toBe(0);
    expect(
      (await Resource.$create({'@type': 'binary', '@value': 'data:;base64,AQID'})).$value.toJSON()
    ).toEqual({
      type: 'Buffer',
      data: [1, 2, 3]
    });
    await expect(Resource.$create({'@type': 'binary', '@value': 'hello'})).rejects.toBeInstanceOf(
      Error
    );
  });

  test('serialization', async () => {
    expect((await Resource.$create(Buffer.alloc(0))).$serialize()).toBe('data:;base64,');
    expect((await Resource.$create(Buffer.from([1, 2, 3]))).$serialize()).toBe('data:;base64,AQID');
  });
});
