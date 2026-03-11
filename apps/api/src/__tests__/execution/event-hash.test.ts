import { createEventHash, createNormalizedConfigurationJson } from '../../execution/event-hash';
import { PrimitiveConfiguration } from '../../execution/models';

describe('event-hash', () => {
    function makeConfiguration(): PrimitiveConfiguration {
        return {
            device: { deviceId: 'device-1' },
            identity: { actorId: 'user-1', actorType: 'user' },
            intent: {
                actionType: 'AUTH_CHALLENGE',
                requestedAt: '2026-03-10T00:00:00.000Z',
                deterministicKey: 'key-1',
            },
            legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['e1'] },
            context: {
                route: '/auth/challenge',
                requestId: 'req-1',
                timestamp: '2026-03-10T00:00:00.000Z',
            },
            capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
            payload: {
                alpha: 1,
                nested: { z: 1, a: 2 },
            },
        };
    }

    test('produces same hash when only volatile timestamps change', () => {
        const a = makeConfiguration();
        const b: PrimitiveConfiguration = {
            ...a,
            intent: { ...a.intent, requestedAt: '2099-01-01T00:00:00.000Z' },
            context: { ...a.context, timestamp: '2099-01-01T00:00:00.000Z' },
        };

        expect(createEventHash(a)).toBe(createEventHash(b));
    });

    test('changes hash when deterministic fields change', () => {
        const a = makeConfiguration();
        const b: PrimitiveConfiguration = {
            ...a,
            identity: { ...a.identity, actorId: 'user-2' },
        };

        expect(createEventHash(a)).not.toBe(createEventHash(b));
    });

    test('normalizes object key order before hashing', () => {
        const a = makeConfiguration();
        const b: PrimitiveConfiguration = {
            ...a,
            payload: {
                nested: { a: 2, z: 1 },
                alpha: 1,
            },
        };

        expect(createNormalizedConfigurationJson(a)).toBe(createNormalizedConfigurationJson(b));
        expect(createEventHash(a)).toBe(createEventHash(b));
    });
});
