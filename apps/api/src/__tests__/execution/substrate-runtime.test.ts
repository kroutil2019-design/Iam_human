import { SubstrateRuntime } from '../../substrate/substrate-runtime';
import { ActionRequest } from '../../execution/models';

describe('substrate-runtime', () => {
  const runtime = new SubstrateRuntime();

  beforeEach(() => {
    runtime.resetState();
  });

  describe('determinism guard', () => {
    test('identical ActionRequest inputs produce identical eventHash and executionId', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: { publicKey: 'pk-123' },
      };

      jest.useFakeTimers({ now: new Date('2026-03-11T00:00:00.000Z') });

      const result1 = runtime.run(request);
      const result2 = runtime.run(request);

      jest.useRealTimers();

      // Verify hashes are identical
      expect(result1.eventHash).toBe(result2.eventHash);
      expect(result1.executionId).toBe(result2.executionId);

      // Verify both succeeded
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify execution outputs are identical
      expect(result1.output?.executionId).toBe(result2.output?.executionId);
      expect(result1.output?.outputHash).toBe(result2.output?.outputHash);
      expect(result1.output?.actionType).toBe(result2.output?.actionType);
    });

    test('deterministic result structure consistent across runs', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-2' },
        identity: { actorId: 'anon-2', actorType: 'anonymous' },
        intent: { actionType: 'PROOF_VERIFY' },
        legitimacy: { authMethod: 'public', trustLevel: 'low' },
        context: { route: '/proofs/verify' },
        capability: { permissions: ['proof:verify'] },
        payload: { token: 'tok-xyz' },
      };

      jest.useFakeTimers({ now: new Date('2026-03-11T12:00:00.000Z') });

      const result1 = runtime.run(request);
      const result2 = runtime.run(request);
      const result3 = runtime.run(request);

      jest.useRealTimers();

      // All three runs must be identical
      expect(result1.eventHash).toBe(result2.eventHash);
      expect(result2.eventHash).toBe(result3.eventHash);

      expect(result1.executionId).toBe(result2.executionId);
      expect(result2.executionId).toBe(result3.executionId);

      // Verify all succeeded with same output
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      expect(result1.output?.outputHash).toBe(result2.output?.outputHash);
      expect(result2.output?.outputHash).toBe(result3.output?.outputHash);
    });

    test('determinism guaranteed even with deeply nested payload', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-3' },
        identity: { actorId: 'user-3' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'high' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: {
          nested: {
            deeply: {
              value: 'test-data',
              numbers: [1, 2, 3],
              object: { key: 'value' },
            },
          },
        },
      };

      jest.useFakeTimers({ now: new Date('2026-03-11T06:30:00.000Z') });

      const result1 = runtime.run(request);
      const result2 = runtime.run(request);

      jest.useRealTimers();

      expect(result1.eventHash).toBe(result2.eventHash);
      expect(result1.executionId).toBe(result2.executionId);
      expect(result1.output?.outputHash).toBe(result2.output?.outputHash);
    });

    test('metrics tracking enabled during deterministic runs', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-4' },
        identity: { actorId: 'actor-1' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth' },
        capability: { permissions: ['auth:challenge'] },
        payload: {},
      };

      jest.useFakeTimers({ now: new Date('2026-03-11T00:00:00.000Z') });

      const result1 = runtime.run(request);
      const result2 = runtime.run(request);

      jest.useRealTimers();

      // Verify determinism
      expect(result1.eventHash).toBe(result2.eventHash);

      // Verify metrics were tracked
      const metrics = runtime.getDeterminismMetrics();
      expect(metrics.totalExecutions).toBeGreaterThanOrEqual(2);
      expect(metrics.successCount).toBeGreaterThanOrEqual(2);
      expect(metrics.executionsByActor['actor-1']).toBeGreaterThanOrEqual(2);
      expect(metrics.executionsByAction['AUTH_CHALLENGE']).toBeGreaterThanOrEqual(2);
    });

    test('determinism holds across state resets', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-5' },
        identity: { actorId: 'user-5' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: { data: 'test' },
      };

      jest.useFakeTimers({ now: new Date('2026-03-11T00:00:00.000Z') });

      const result1 = runtime.run(request);

      // Reset state
      runtime.resetState();

      // Run same request again
      const result2 = runtime.run(request);

      jest.useRealTimers();

      // Determinism must be preserved even after reset
      expect(result1.eventHash).toBe(result2.eventHash);
      expect(result1.executionId).toBe(result2.executionId);
      expect(result1.output?.outputHash).toBe(result2.output?.outputHash);
    });

    test('event hash hex format validation', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-6' },
        identity: { actorId: 'user-6' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth' },
        capability: { permissions: ['auth:challenge'] },
        payload: {},
      };

      const result = runtime.run(request);

      // Event hash should be 64-character hex (SHA256)
      expect(result.eventHash).toMatch(/^[a-f0-9]{64}$/);

      // Execution ID should be 32-character hex
      expect(result.executionId).toMatch(/^[a-f0-9]{32}$/);

      // Output execution ID should match the result execution ID
      expect(result.output?.executionId).toBe(result.executionId);
    });

    test('identical logical requests with different object references produce same hash', () => {
      // Two request objects with identical data but different references
      const request1: ActionRequest = {
        device: { deviceId: 'dev-7' },
        identity: { actorId: 'user-7' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth' },
        capability: { permissions: ['auth:challenge'] },
        payload: { key: 'value' },
      };

      const request2: ActionRequest = {
        device: { deviceId: 'dev-7' },
        identity: { actorId: 'user-7' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth' },
        capability: { permissions: ['auth:challenge'] },
        payload: { key: 'value' },
      };

      jest.useFakeTimers({ now: new Date('2026-03-11T00:00:00.000Z') });

      const result1 = runtime.run(request1);
      const result2 = runtime.run(request2);

      jest.useRealTimers();

      // Different object references, same data → same hash
      expect(request1).not.toBe(request2);
      expect(result1.eventHash).toBe(result2.eventHash);
      expect(result1.executionId).toBe(result2.executionId);
    });
  });

  describe('failed execution determinism', () => {
    test('failed validations produce consistent results', () => {
      // Request that fails validation (low trust for AUTH action)
      const request: ActionRequest = {
        device: { deviceId: 'dev-fail' },
        identity: { actorId: 'user-fail' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'low' }, // Low trust rejects AUTH
        context: { route: '/auth' },
        capability: { permissions: ['auth:challenge'] },
        payload: {},
      };

      jest.useFakeTimers({ now: new Date('2026-03-11T00:00:00.000Z') });

      const result1 = runtime.run(request);
      const result2 = runtime.run(request);

      jest.useRealTimers();

      // Even failures must be deterministic
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);

      expect(result1.eventHash).toBe(result2.eventHash);
      expect(result1.executionId).toBe(result2.executionId);
    });
  });
});
