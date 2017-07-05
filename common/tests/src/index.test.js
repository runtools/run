import * as common from '../..';

describe('Common functions', () => {
  test('compactObject()', () => {
    let obj = {a: 1, b: undefined};
    obj = common.compactObject(obj);
    expect(obj.a).toBe(1);
    expect('b' in obj).toBe(false);
    if (obj === false) {
      console.log('arf');
    }
  });
});
