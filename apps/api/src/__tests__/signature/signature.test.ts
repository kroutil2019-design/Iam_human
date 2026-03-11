import { ConstraintEvaluator } from '../../execution/constraint-evaluator';
import { PrimitiveConfiguration } from '../../execution/models';

describe('signature', () => {
  const evaluator = new ConstraintEvaluator();

  function makeConfig(payload: Record<string, unknown>): PrimitiveConfiguration {
    return {
      device: { deviceId: 'dev-1' },
      identity: { actorId: 'user-1', actorType: 'user' },
      intent: { actionType: 'AUTH_VERIFY', requestedAt: 't1', deterministicKey: 'k1' },
      legitimacy: { authMethod: 'jwt', trustLevel: 'high', evidence: ['ok'] },
      context: { route: '/auth/verify', timestamp: 't1' },
      capability: { permissions: ['auth:verify'], constraintsVersion: '1.0.0' },
      payload,
    };
  }

  test('permits AUTH_VERIFY when snake_case public_key is provided', () => {
    const result = evaluator.evaluate(
      makeConfig({ public_key: 'pk1', nonce: 'n1', signature: 'sig1' })
    );
    expect(result.decision).toBe('PERMITTED');
  });

  test('rejects AUTH_VERIFY when signature is missing', () => {
    const result = evaluator.evaluate(makeConfig({ publicKey: 'pk1', nonce: 'n1' }));
    expect(result.decision).toBe('REJECTED');
  });
});
