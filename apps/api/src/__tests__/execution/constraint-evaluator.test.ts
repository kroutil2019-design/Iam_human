import { ConstraintEvaluator } from '../../execution/constraint-evaluator';
import { PrimitiveConfiguration } from '../../execution/models';

describe('constraint-evaluator', () => {
    const evaluator = new ConstraintEvaluator();

    function makeConfiguration(overrides: Partial<PrimitiveConfiguration> = {}): PrimitiveConfiguration {
        return {
            device: { deviceId: 'device-1' },
            identity: { actorId: 'user-1', actorType: 'user' },
            intent: {
                actionType: 'AUTH_VERIFY',
                requestedAt: '2026-03-10T00:00:00.000Z',
                deterministicKey: 'k1',
            },
            legitimacy: { authMethod: 'jwt', trustLevel: 'high', evidence: ['proof'] },
            context: { route: '/auth/verify', timestamp: '2026-03-10T00:00:00.000Z' },
            capability: { permissions: ['auth:verify'], constraintsVersion: '1.0.0' },
            payload: {
                publicKey: 'pk1',
                nonce: 'n1',
                signature: 'sig1',
            },
            ...overrides,
        };
    }

    test('permits valid AUTH_VERIFY input', () => {
        const result = evaluator.evaluate(makeConfiguration());
        expect(result).toEqual({ decision: 'PERMITTED', reasons: [] });
    });

    test('rejects AUTH_VERIFY when required signature fields are missing', () => {
        const result = evaluator.evaluate(
            makeConfiguration({ payload: { publicKey: 'pk1', nonce: 'n1' } })
        );
        expect(result.decision).toBe('REJECTED');
        expect(result.reasons[0]).toMatch(/AUTH_VERIFY requires/);
    });

    test('rejects low-trust AUTH actions by policy', () => {
        const result = evaluator.evaluate(
            makeConfiguration({ legitimacy: { authMethod: 'jwt', trustLevel: 'low', evidence: ['proof'] } })
        );
        expect(result.decision).toBe('REJECTED');
        expect(result.reasons).toEqual([
            'Policy constraint: AUTH actions require trust level medium or high',
        ]);
    });

    test('halts when actorId is empty at state phase', () => {
        const result = evaluator.evaluate(
            makeConfiguration({
                intent: {
                    actionType: 'PROOF_VERIFY',
                    requestedAt: '2026-03-10T00:00:00.000Z',
                    deterministicKey: 'k2',
                },
                identity: { actorId: '   ', actorType: 'anonymous' },
                legitimacy: { authMethod: 'public', trustLevel: 'low', evidence: ['proof'] },
                payload: { token_value: 'tok1' },
            })
        );
        expect(result).toEqual({
            decision: 'HALT',
            reasons: ['State constraint: actorId is empty'],
        });
    });
});