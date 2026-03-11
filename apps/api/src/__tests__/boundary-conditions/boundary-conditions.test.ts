import { deterministicPipeline } from '../../execution';
import { ConstraintEvaluator } from '../../execution/constraint-evaluator';
import { ZGateValidator } from '../../execution/z-gate-validator';
import { PrimitiveConfiguration } from '../../execution/models';
import { ActionRequest } from '../../execution/models';

describe('boundary-conditions', () => {
  const evaluator = new ConstraintEvaluator();
  const validator = new ZGateValidator();

  describe('empty and whitespace boundaries', () => {
    test('rejects actorId that is all whitespace after trimming', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: '   ' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: {},
      };

      const result = deterministicPipeline.run(request);
      expect(result.execution.success).toBe(false);
    });

    test('accepts actorId with leading/trailing whitespace that trims to valid', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: '  user-1  ' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: {},
      };

      const result = deterministicPipeline.run(request);
      expect(result.execution.success).toBe(true);
    });

    test('validator rejects deviceId that is empty after trimming', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: '' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'AUTH_CHALLENGE', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['ok'] },
        context: { route: '/auth/challenge', timestamp: 't1' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid device primitive: deviceId is required');
    });

    test('validator rejects route that is empty after trimming', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'AUTH_CHALLENGE', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['ok'] },
        context: { route: '', timestamp: 't1' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid context primitive: route is required');
    });
  });

  describe('trust level boundaries', () => {
    test('low trust rejects AUTH_CHALLENGE constraint', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'AUTH_CHALLENGE', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'low', evidence: ['ok'] },
        context: { route: '/auth/challenge', timestamp: 't1' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const result = evaluator.evaluate(config);
      expect(result.decision).toBe('REJECTED');
    });

    test('medium trust allows AUTH_CHALLENGE', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'AUTH_CHALLENGE', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['ok'] },
        context: { route: '/auth/challenge', timestamp: 't1' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const result = evaluator.evaluate(config);
      expect(result.decision).toBe('PERMITTED');
    });

    test('high trust allows AUTH_CHALLENGE', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'AUTH_CHALLENGE', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'high', evidence: ['ok'] },
        context: { route: '/auth/challenge', timestamp: 't1' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const result = evaluator.evaluate(config);
      expect(result.decision).toBe('PERMITTED');
    });
  });

  describe('payload edge cases', () => {
    test('accepts empty payload object', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: {},
      };

      const result = deterministicPipeline.run(request);
      expect(result.execution.success).toBe(true);
    });

    test('accepts payload with nested objects', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: { nested: { deeply: { value: 'test' } } },
      };

      const result = deterministicPipeline.run(request);
      expect(result.execution.success).toBe(true);
    });

    test('accepts payload with arrays', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: { items: [1, 2, 3, 'four', { five: 5 }] },
      };

      const result = deterministicPipeline.run(request);
      expect(result.execution.success).toBe(true);
    });
  });

  describe('actor type boundaries', () => {
    test('anonymous actor allows PROOF_VERIFY action', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'anon-1', actorType: 'anonymous' },
        intent: { actionType: 'PROOF_VERIFY', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'public', trustLevel: 'low', evidence: ['ok'] },
        context: { route: '/proofs/verify', timestamp: 't1' },
        capability: { permissions: ['proof:verify'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const result = evaluator.evaluate(config);
      expect(result.decision).toBe('PERMITTED');
    });

    test('user actor cannot use PROOF_VERIFY (must be anonymous)', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'PROOF_VERIFY', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['ok'] },
        context: { route: '/proofs/verify', timestamp: 't1' },
        capability: { permissions: ['proof:verify'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const validationResult = validator.validate(config);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors[0]).toContain('PROOF_VERIFY must use anonymous actorType');
    });

    test('AUTH_* actions cannot use public authMethod', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: { actionType: 'AUTH_CHALLENGE', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'public', trustLevel: 'medium', evidence: ['ok'] },
        context: { route: '/auth/challenge', timestamp: 't1' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const validationResult = validator.validate(config);
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors[0]).toContain('AUTH_* actions cannot use public authMethod');
    });
  });

  describe('deterministic reproducibility at boundaries', () => {
    test('identical requests at boundary produce identical hashes', () => {
      const request: ActionRequest = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: '  user-1  ' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/auth/challenge' },
        capability: { permissions: ['auth:challenge'] },
        payload: {},
      };

      jest.useFakeTimers({ now: new Date('2026-03-10T00:00:00.000Z') });
      const result1 = deterministicPipeline.run(request);
      const result2 = deterministicPipeline.run(request);
      jest.useRealTimers();

      expect(result1.eventHash).toBe(result2.eventHash);
    });

    test('boundary values produce consistent output structure', () => {
      const request: ActionRequest = {
        device: { deviceId: 'd' },
        identity: { actorId: 'a' },
        intent: { actionType: 'AUTH_CHALLENGE' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
        context: { route: '/' },
        capability: { permissions: ['auth:challenge'] },
        payload: { x: 1 },
      };

      const result = deterministicPipeline.run(request);
      expect(result.execution.success).toBe(true);
      expect(result.execution.output).toHaveProperty('executionId');
      expect(result.execution.output?.executionId).toMatch(/^[a-f0-9]{32}$/);
      expect(result.execution.output).toHaveProperty('outputHash');
      expect(result.execution.output?.outputHash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('multiple validation errors reported collectively', () => {
      const config: PrimitiveConfiguration = {
        device: { deviceId: '' },
        identity: { actorId: '   ', actorType: 'user' },
        intent: { actionType: '', requestedAt: 't1', deterministicKey: 'k1' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'low', evidence: [] },
        context: { route: '', timestamp: 't1' },
        capability: { permissions: ['test'], constraintsVersion: '1.0.0' },
        payload: {},
      };

      const result = validator.validate(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

