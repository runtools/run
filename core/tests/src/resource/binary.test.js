import BinaryResource from '../../../dist/resource/binary';

describe('BinaryResource', () => {
  test('creation', async () => {
    expect(await BinaryResource.$create()).toBeInstanceOf(BinaryResource);
    expect((await BinaryResource.$create()).$value).toBeUndefined();
    expect(
      Buffer.isBuffer((await BinaryResource.$create({'@value': Buffer.alloc(0)})).$value)
    ).toBe(true);
    expect((await BinaryResource.$create({'@value': Buffer.alloc(0)})).$value.length).toBe(0);
    expect(
      (await BinaryResource.$create({'@value': Buffer.from([1, 2, 3])})).$value.toJSON()
    ).toEqual({type: 'Buffer', data: [1, 2, 3]});
    expect((await BinaryResource.$create({'@value': 'data:;base64,'})).$value.length).toBe(0);
    expect(
      (await BinaryResource.$create({'@value': 'data:;base64,AQID'})).$value.toJSON()
    ).toEqual({type: 'Buffer', data: [1, 2, 3]});
    expect((await BinaryResource.$create('data:;base64,AQID')).$value.toJSON()).toEqual({
      type: 'Buffer',
      data: [1, 2, 3]
    });
    await expect(BinaryResource.$create({'@value': 'hello'})).rejects.toBeInstanceOf(Error);
    await expect(BinaryResource.$create('hello')).rejects.toBeInstanceOf(Error);
  });

  test('serialization', async () => {
    expect((await BinaryResource.$create()).$serialize()).toBeUndefined();
    expect((await BinaryResource.$create(Buffer.alloc(0))).$serialize()).toBe('data:;base64,');
    expect((await BinaryResource.$create(Buffer.from([1, 2, 3]))).$serialize()).toBe(
      'data:;base64,AQID'
    );
  });
});
