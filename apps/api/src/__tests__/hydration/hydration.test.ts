import { ConfigurationBuilder } from '../../execution/configuration-builder';
import { ActionRequest } from '../../execution/models';

describe('hydration', () => {
  test('hydrates publicKey from payload.public_key when device.publicKey is absent', () => {
    const request: ActionRequest = {
      device: { deviceId: 'dev-1' },
      identity: { actorId: 'user-1' },
      intent: { actionType: 'AUTH_CHALLENGE' },
      legitimacy: { authMethod: 'jwt' },
      context: { route: '/auth/challenge' },
      capability: { permissions: ['auth:challenge'] },
      payload: { public_key: 'pk-from-payload' },
    };

    const config = new ConfigurationBuilder().build(request);
    expect(config.device.publicKey).toBe('pk-from-payload');
  });
});
