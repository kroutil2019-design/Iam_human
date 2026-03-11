import { actionIndex, deterministicPipeline } from '../../execution';
import { ActionRequest } from '../../execution/models';

describe('integration surface', () => {
  test('wired pipeline updates shared action index singleton', () => {
    actionIndex.reset();

    const request: ActionRequest = {
      device: { deviceId: 'dev-1' },
      identity: { actorId: 'user-1', actorType: 'user' },
      intent: { actionType: 'AUTH_CHALLENGE' },
      legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
      context: { route: '/auth/challenge' },
      capability: { permissions: ['auth:challenge'] },
      payload: { publicKey: 'pk1' },
    };

    deterministicPipeline.run(request);

    const snapshot = actionIndex.snapshot();
    expect(snapshot.totals.received).toBe(1);
    expect(snapshot.totals.configurationBuilt).toBe(1);
    expect(snapshot.byIntent.AUTH_CHALLENGE).toBe(1);
  });
});
