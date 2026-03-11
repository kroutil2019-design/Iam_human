import { stableStringify } from '../../execution/utils';

describe('canonicalization', () => {
    test('produces identical serialized form for equivalent objects with different key order', () => {
        const a = {
            actorId: 'user-1',
            payload: { b: 2, a: 1, nested: { y: 2, x: 1 } },
        };
        const b = {
            payload: { nested: { x: 1, y: 2 }, a: 1, b: 2 },
            actorId: 'user-1',
        };

        expect(stableStringify(a)).toBe(stableStringify(b));
    });
});

