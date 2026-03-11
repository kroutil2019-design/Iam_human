import { createNormalizedConfigurationJson } from '../../execution/event-hash';
import { PrimitiveConfiguration } from '../../execution/models';

describe('normalization', () => {
  test('normalizes configuration by blanking volatile timestamps', () => {
    const configuration: PrimitiveConfiguration = {
      device: { deviceId: 'dev-1', publicKey: undefined },
      identity: { actorId: 'user-1', actorType: 'user' },
      intent: {
        actionType: 'AUTH_CHALLENGE',
        requestedAt: '2026-03-10T12:00:00.000Z',
        deterministicKey: 'k1',
      },
      legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['ok'] },
      context: {
        route: '/auth/challenge',
        requestId: 'req-1',
        timestamp: '2026-03-10T12:00:00.000Z',
      },
      capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
      payload: { alpha: 1, optional: undefined },
    };

    const normalized = createNormalizedConfigurationJson(configuration);

    expect(normalized).toContain('"requestedAt":""');
    expect(normalized).toContain('"timestamp":""');
    expect(normalized).not.toContain('optional');
  });
});
