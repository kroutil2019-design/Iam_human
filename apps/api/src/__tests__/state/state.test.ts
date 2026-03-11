import { ConstraintEvaluator } from '../../execution/constraint-evaluator';
import { PrimitiveConfiguration } from '../../execution/models';

describe('state', () => {
  const evaluator = new ConstraintEvaluator();

  function makeConfig(actorId: string): PrimitiveConfiguration {
    return {
      device: { deviceId: 'dev-1' },
      identity: { actorId, actorType: 'anonymous' },
      intent: { actionType: 'PROOF_VERIFY', requestedAt: 't1', deterministicKey: 'k1' },
      legitimacy: { authMethod: 'public', trustLevel: 'low', evidence: ['ok'] },
      context: { route: '/proofs/verify', timestamp: 't1' },
      capability: { permissions: ['proof:verify'], constraintsVersion: '1.0.0' },
      payload: { token_value: 'tok-1' },
    };
  }

  test('halts when actorId is empty after trimming', () => {
    const result = evaluator.evaluate(makeConfig('   '));
    expect(result).toEqual({
      decision: 'HALT',
      reasons: ['State constraint: actorId is empty'],
    });
  });

  test('permits when actorId is present', () => {
    const result = evaluator.evaluate(makeConfig('anonymous'));
    expect(result.decision).toBe('PERMITTED');
  });
});
