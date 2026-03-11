import { ConfigurationBuilder } from '../../execution/configuration-builder';
import { ActionRequest } from '../../execution/models';

describe('actor-resolution', () => {
    test('uses actorId from identity primitive when building configuration', () => {
        const request: ActionRequest = {
            device: { deviceId: 'dev-1' },
            identity: { actorId: 'user-1', actorType: 'user' },
            intent: { actionType: 'AUTH_CHALLENGE' },
            legitimacy: { authMethod: 'jwt' },
            context: { route: '/auth/challenge' },
            capability: { permissions: ['auth:challenge'] },
            payload: {},
        };

        const config = new ConfigurationBuilder().build(request);
        expect(config.identity.actorId).toBe('user-1');
    });
});

