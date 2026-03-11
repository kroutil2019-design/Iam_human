import { ExecutionController } from '../../execution/execution-controller';
import { PrimitiveConfiguration, ValidationResult } from '../../execution/models';

describe('error-mapping', () => {
    const executionUnit = { run: jest.fn() };
    const controller = new ExecutionController(executionUnit as any);

    const configuration: PrimitiveConfiguration = {
        device: { deviceId: 'dev-1' },
        identity: { actorId: 'user-1', actorType: 'user' },
        intent: {
            actionType: 'AUTH_CHALLENGE',
            requestedAt: '2026-03-10T00:00:00.000Z',
            deterministicKey: 'k',
        },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['ok'] },
        context: { route: '/auth/challenge', timestamp: '2026-03-10T00:00:00.000Z' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
    };

    test('maps invalid validation result to execution blocked message', () => {
        const validation: ValidationResult = { valid: false, errors: ['missing'] };
        const result = controller.execute(configuration, validation, { decision: 'PERMITTED', reasons: [] });

        expect(result).toEqual({
            success: false,
            error: 'Execution blocked: invalid primitive configuration',
        });
    });

    test('maps non-permitted constraints to explicit blocked-by-constraints message', () => {
        const result = controller.execute(configuration, { valid: true, errors: [] }, { decision: 'REJECTED', reasons: ['rule'] });

        expect(result).toEqual({
            success: false,
            error: 'Execution blocked by constraints: REJECTED',
        });
    });
});
