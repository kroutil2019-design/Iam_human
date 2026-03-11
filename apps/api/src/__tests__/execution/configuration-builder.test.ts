import { ConfigurationBuilder } from '../../execution/configuration-builder';
import { ActionRequest } from '../../execution/models';

describe('configuration-builder', () => {
  const builder = new ConfigurationBuilder();

  test('hydrates device fields from payload and applies defaults', () => {
    const input: ActionRequest = {
      device: { deviceId: 'device-1' },
      identity: { actorId: 'user-1' },
      intent: { actionType: 'AUTH_CHALLENGE' },
      legitimacy: { authMethod: 'jwt' },
      context: {},
      capability: {},
      payload: {
        public_key: 'pk_123',
        fingerprint: 'fp_456',
      },
    };

    const config = builder.build(input);

    expect(config.device.publicKey).toBe('pk_123');
    expect(config.device.fingerprint).toBe('fp_456');
    expect(config.identity.actorType).toBe('user');
    expect(config.legitimacy.trustLevel).toBe('low');
    expect(config.context.route).toBe('unknown');
    expect(config.capability.constraintsVersion).toBe('1.0.0');
  });

  test('builds deterministic intent key for equivalent inputs', () => {
    const baseInput: ActionRequest = {
      device: { deviceId: 'device-1' },
      identity: { actorId: 'user-1', actorType: 'user' },
      intent: { actionType: 'AUTH_VERIFY' },
      legitimacy: { authMethod: 'jwt', trustLevel: 'high', evidence: ['token'] },
      context: { route: '/auth/verify' },
      capability: { permissions: ['auth:verify'] },
      payload: {
        nonce: 'n1',
        signature: 's1',
        publicKey: 'pk1',
      },
    };

    const configA = builder.build(baseInput);
    const configB = builder.build({ ...baseInput, payload: { ...baseInput.payload } });

    expect(configA.intent.deterministicKey).toBe(configB.intent.deterministicKey);
    expect(configA.intent.actionType).toBe('AUTH_VERIFY');
  });
});