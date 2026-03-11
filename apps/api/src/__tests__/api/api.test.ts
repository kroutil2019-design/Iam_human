import { deterministicPipeline } from '../../execution';
import { ActionRequest } from '../../execution/models';

describe('api', () => {
  test('returns deterministic output and event hash for identical requests', () => {
    const request: ActionRequest = {
      device: { deviceId: 'dev-1' },
      identity: { actorId: 'user-1', actorType: 'user' },
      intent: { actionType: 'AUTH_CHALLENGE' },
      legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
      context: { route: '/auth/challenge' },
      capability: { permissions: ['auth:challenge'] },
      payload: { publicKey: 'pk1' },
    };

    jest.useFakeTimers({ now: new Date('2026-03-10T00:00:00.000Z') });
    const first = deterministicPipeline.run(request);
    const second = deterministicPipeline.run(request);
    jest.useRealTimers();

    expect(first.execution.success).toBe(true);
    expect(second.execution.success).toBe(true);
    expect(first.eventHash).toBe(second.eventHash);
    expect(first.execution.output?.outputHash).toBe(second.execution.output?.outputHash);
  });
});
