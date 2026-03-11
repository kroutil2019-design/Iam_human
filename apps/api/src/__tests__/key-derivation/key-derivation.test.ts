import { hashDeterministic } from '../../execution/utils';

describe('key derivation', () => {
  test('derives stable key for semantically equivalent objects', () => {
    const a = { actorId: 'user-1', payload: { b: 2, a: 1 } };
    const b = { payload: { a: 1, b: 2 }, actorId: 'user-1' };

    expect(hashDeterministic(a)).toBe(hashDeterministic(b));
  });

  test('derives different key when payload changes', () => {
    const a = { actorId: 'user-1', payload: { nonce: 'n1' } };
    const b = { actorId: 'user-1', payload: { nonce: 'n2' } };

    expect(hashDeterministic(a)).not.toBe(hashDeterministic(b));
  });
});
