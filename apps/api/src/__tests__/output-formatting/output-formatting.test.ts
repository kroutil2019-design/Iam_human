import { AtomicExecutionUnit } from '../../execution/atomic-execution-unit';

describe('output formatting', () => {
  test('returns deterministic output contract fields', () => {
    const unit = new AtomicExecutionUnit();

    const output = unit.run(
      { deviceId: 'dev-1' },
      { actorId: 'user-1', actorType: 'user' },
      { actionType: 'AUTH_CHALLENGE', requestedAt: 't1', deterministicKey: 'k1' },
      { authMethod: 'jwt', trustLevel: 'medium', evidence: ['ok'] },
      { route: '/auth/challenge', timestamp: 't1' },
      { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' }
    );

    expect(output.executionId).toHaveLength(32);
    expect(output.outputHash).toHaveLength(64);
    expect(output.actionType).toBe('AUTH_CHALLENGE');
    expect(output.payload).toEqual({ deterministicInputHash: output.outputHash });
  });
});
