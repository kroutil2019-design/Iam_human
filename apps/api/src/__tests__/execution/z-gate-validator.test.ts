import { ZGateValidator } from '../../execution/z-gate-validator';
import { PrimitiveConfiguration } from '../../execution/models';

describe('ZGateValidator', () => {
  const validator = new ZGateValidator();

  function makeConfig(overrides: Partial<PrimitiveConfiguration> = {}): PrimitiveConfiguration {
    return {
      device: { deviceId: 'dev-1' },
      identity: { actorId: 'user-1', actorType: 'user' },
      intent: {
        actionType: 'AUTH_CHALLENGE',
        requestedAt: new Date().toISOString(),
        deterministicKey: 'abc123',
      },
      legitimacy: {
        authMethod: 'jwt',
        trustLevel: 'medium',
        evidence: ['action_request_received'],
      },
      context: {
        route: '/auth/challenge',
        timestamp: new Date().toISOString(),
      },
      capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
      payload: {},
      ...overrides,
    };
  }

  it('accepts a valid configuration', () => {
    const result = validator.validate(makeConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- Primitive presence ---
  it('rejects when device is falsy', () => {
    const config = makeConfig();
    (config as unknown as Record<string, unknown>).device = null;
    const result = validator.validate(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing primitive: device');
  });

  it('rejects when identity is falsy', () => {
    const config = makeConfig();
    (config as unknown as Record<string, unknown>).identity = null;
    const result = validator.validate(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing primitive: identity');
  });

  // --- Structural validation ---
  it('rejects empty deviceId', () => {
    const result = validator.validate(makeConfig({ device: { deviceId: '   ' } }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid device primitive: deviceId is required');
  });

  it('rejects empty actorId', () => {
    const result = validator.validate(
      makeConfig({ identity: { actorId: '', actorType: 'user' } })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid identity primitive: actorId is required');
  });

  it('rejects empty actionType', () => {
    const result = validator.validate(
      makeConfig({
        intent: { actionType: '', requestedAt: new Date().toISOString(), deterministicKey: 'k' },
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid intent primitive: actionType is required');
  });

  it('rejects when permissions is not an array', () => {
    const config = makeConfig();
    (config.capability as unknown as Record<string, unknown>).permissions = 'not-array';
    const result = validator.validate(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid capability primitive: permissions must be an array');
  });

  // --- Semantic coherence ---
  it('rejects AUTH_* with public authMethod', () => {
    const result = validator.validate(
      makeConfig({
        legitimacy: {
          authMethod: 'public',
          trustLevel: 'low',
          evidence: ['action_request_received'],
        },
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Semantic mismatch: AUTH_* actions cannot use public authMethod');
  });

  it('rejects PROOF_VERIFY with non-anonymous actorType', () => {
    const result = validator.validate(
      makeConfig({
        intent: {
          actionType: 'PROOF_VERIFY',
          requestedAt: new Date().toISOString(),
          deterministicKey: 'k',
        },
        identity: { actorId: 'user-1', actorType: 'user' },
        legitimacy: {
          authMethod: 'public',
          trustLevel: 'low',
          evidence: ['action_request_received'],
        },
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Semantic mismatch: PROOF_VERIFY must use anonymous actorType');
  });

  it('accepts PROOF_VERIFY with anonymous actorType', () => {
    const result = validator.validate(
      makeConfig({
        intent: {
          actionType: 'PROOF_VERIFY',
          requestedAt: new Date().toISOString(),
          deterministicKey: 'k',
        },
        identity: { actorId: 'anonymous', actorType: 'anonymous' },
        legitimacy: {
          authMethod: 'public',
          trustLevel: 'low',
          evidence: ['action_request_received'],
        },
      })
    );
    expect(result.valid).toBe(true);
  });

  it('rejects anonymous actorType for non-allowed actions', () => {
    const result = validator.validate(
      makeConfig({
        intent: {
          actionType: 'PROOF_ISSUE',
          requestedAt: new Date().toISOString(),
          deterministicKey: 'k',
        },
        identity: { actorId: 'user-1', actorType: 'anonymous' },
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Semantic mismatch: anonymous actorType is not allowed for this action'
    );
  });

  it('allows anonymous actorType for AUTH_REQUEST_OTP', () => {
    const result = validator.validate(
      makeConfig({
        intent: {
          actionType: 'AUTH_REQUEST_OTP',
          requestedAt: new Date().toISOString(),
          deterministicKey: 'k',
        },
        identity: { actorId: 'email@test.com', actorType: 'anonymous' },
        legitimacy: {
          authMethod: 'otp',
          trustLevel: 'medium',
          evidence: ['action_request_received'],
        },
      })
    );
    expect(result.valid).toBe(true);
  });

  it('allows anonymous actorType for AUTH_VERIFY_OTP', () => {
    const result = validator.validate(
      makeConfig({
        intent: {
          actionType: 'AUTH_VERIFY_OTP',
          requestedAt: new Date().toISOString(),
          deterministicKey: 'k',
        },
        identity: { actorId: 'email@test.com', actorType: 'anonymous' },
        legitimacy: {
          authMethod: 'otp',
          trustLevel: 'medium',
          evidence: ['action_request_received'],
        },
      })
    );
    expect(result.valid).toBe(true);
  });
});
