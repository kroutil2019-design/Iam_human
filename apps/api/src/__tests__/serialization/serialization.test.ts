import { stableStringify } from '../../execution/utils';

describe('serialization', () => {
  test('serializes undefined and null distinctly', () => {
    expect(stableStringify(undefined)).toBeUndefined();
    expect(stableStringify(null)).toBe('null');
  });

  test('serializes arrays with stable ordering of nested objects', () => {
    const value = [{ b: 2, a: 1 }, { d: 4, c: 3 }];
    expect(stableStringify(value)).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });
});
