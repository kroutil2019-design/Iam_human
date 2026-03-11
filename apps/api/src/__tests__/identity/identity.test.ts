import { ConfigurationBuilder } from '../../execution/configuration-builder';
import { ActionRequest } from '../../execution/models';

describe('identity', () => {
  const builder = new ConfigurationBuilder();

  test('defaults actorType to user when omitted', () => {
    const request: ActionRequest = {
      device: { deviceId: 'dev-1' },
      identity: { actorId: 'user-1' },
      intent: { actionType: 'AUTH_CHALLENGE' },
      legitimacy: { authMethod: 'jwt' },
      context: { route: '/auth/challenge' },
      capability: {},
      payload: {},
    };

    expect(builder.build(request).identity.actorType).toBe('user');
  });

  test('preserves explicit anonymous actorType', () => {
    const request: ActionRequest = {
      device: { deviceId: 'public-client' },
      identity: { actorId: 'anonymous', actorType: 'anonymous' },
      intent: { actionType: 'PROOF_VERIFY' },
      legitimacy: { authMethod: 'public' },
      context: { route: '/proofs/verify' },
      capability: {},
      payload: { token_value: 'tok-1' },
    };

    expect(builder.build(request).identity.actorType).toBe('anonymous');
  });
});
