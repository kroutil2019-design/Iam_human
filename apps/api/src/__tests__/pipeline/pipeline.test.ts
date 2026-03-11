import { DeterministicExecutionPipeline } from '../../execution/pipeline';
import { ConfigurationBuilder } from '../../execution/configuration-builder';
import { ZGateValidator } from '../../execution/z-gate-validator';
import { ConstraintEvaluator } from '../../execution/constraint-evaluator';
import { ExecutionController } from '../../execution/execution-controller';
import { TelemetryRecorder } from '../../execution/telemetry-recorder';
import { ActionIndex } from '../../execution/action-index';
import { PolarityResolver } from '../../execution/polarity-resolver';
import {
  ActionRequest,
  ConstraintResult,
  DeterministicOutput,
  ExecutionResult,
  PrimitiveConfiguration,
  ValidationResult,
} from '../../execution/models';
import { createEventHash } from '../../execution/event-hash';

describe('DeterministicExecutionPipeline', () => {
  const actionRequest: ActionRequest = {
    device: { deviceId: 'device-1' },
    identity: { actorId: 'user-1', actorType: 'user' },
    intent: { actionType: 'LOGIN' },
    legitimacy: { authMethod: 'jwt', trustLevel: 'high', evidence: ['token_valid'] },
    context: { route: '/auth/login', requestId: 'req-1' },
    capability: { permissions: ['auth:login', 'session:create'], constraintsVersion: '1.0.0' },
    payload: { challenge: 'abc123' },
  };

  const configuration: PrimitiveConfiguration = {
    device: { deviceId: 'device-1' },
    identity: { actorId: 'user-1', actorType: 'user' },
    intent: {
      actionType: 'LOGIN',
      requestedAt: '2026-03-10T00:00:00.000Z',
      deterministicKey: 'det-key',
    },
    legitimacy: { authMethod: 'jwt', trustLevel: 'high', evidence: ['token_valid'] },
    context: {
      route: '/auth/login',
      requestId: 'req-1',
      timestamp: '2026-03-10T00:00:00.000Z',
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
    },
    capability: { permissions: ['auth:login', 'session:create'], constraintsVersion: '1.0.0' },
    payload: { challenge: 'abc123' },
  };

  function buildPipeline(deps: {
    validation: ValidationResult;
    constraints: ConstraintResult;
    execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>>;
  }): {
    pipeline: DeterministicExecutionPipeline;
    mocks: {
      configurationBuilder: jest.Mocked<Pick<ConfigurationBuilder, 'build'>>;
      zGateValidator: jest.Mocked<Pick<ZGateValidator, 'validate'>>;
      constraintEvaluator: jest.Mocked<Pick<ConstraintEvaluator, 'evaluate'>>;
      executionController: jest.Mocked<Pick<ExecutionController, 'execute'>>;
      telemetryRecorder: jest.Mocked<Pick<TelemetryRecorder, 'record'>>;
      actionIndex: ActionIndex;
    };
  } {
    const configurationBuilder: jest.Mocked<Pick<ConfigurationBuilder, 'build'>> = {
      build: jest.fn().mockReturnValue(configuration),
    };

    const zGateValidator: jest.Mocked<Pick<ZGateValidator, 'validate'>> = {
      validate: jest.fn().mockReturnValue(deps.validation),
    };

    const constraintEvaluator: jest.Mocked<Pick<ConstraintEvaluator, 'evaluate'>> = {
      evaluate: jest.fn().mockReturnValue(deps.constraints),
    };

    const executionController: jest.Mocked<Pick<ExecutionController, 'execute'>> = {
      execute: jest.fn().mockReturnValue(deps.execution),
    };

    const telemetryRecorder: jest.Mocked<Pick<TelemetryRecorder, 'record'>> = {
      record: jest.fn(),
    };

    const actionIndex = new ActionIndex();
    const polarityResolver = new PolarityResolver();

    const pipeline = new DeterministicExecutionPipeline(
      configurationBuilder as unknown as ConfigurationBuilder,
      zGateValidator as unknown as ZGateValidator,
      constraintEvaluator as unknown as ConstraintEvaluator,
      executionController as unknown as ExecutionController,
      telemetryRecorder as unknown as TelemetryRecorder,
      actionIndex,
      polarityResolver
    );

    return {
      pipeline,
      mocks: {
        configurationBuilder,
        zGateValidator,
        constraintEvaluator,
        executionController,
        telemetryRecorder,
        actionIndex,
      },
    };
  }

  test('fails closed when z-gate validation is invalid', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: ['Invalid context primitive: route is required'],
    };
    const constraints: ConstraintResult = { decision: 'PERMITTED', reasons: [] };
    const execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>> = {
      success: true,
      output: {
        executionId: 'unused',
        actionType: 'LOGIN',
        outputHash: 'unused',
        payload: {},
      },
    };

    const { pipeline, mocks } = buildPipeline({ validation, constraints, execution });
    const result = pipeline.run(actionRequest);

    expect(mocks.constraintEvaluator.evaluate).not.toHaveBeenCalled();
    expect(mocks.executionController.execute).not.toHaveBeenCalled();
    expect(result.eventHash).toBe(createEventHash(configuration));
    expect(result.polarity).toBe('-');
    expect(result.constraints).toEqual({ decision: 'HALT', reasons: ['Validation failed'] });
    expect(result.execution).toEqual({
      success: false,
      error: 'Fail closed: primitive configuration rejected',
    });

    expect(mocks.telemetryRecorder.record).toHaveBeenCalledTimes(1);
    expect(mocks.telemetryRecorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'configurationRejected',
        actorId: 'user-1',
        actionType: 'LOGIN',
        details: {
          reason: 'Invalid context primitive: route is required',
        },
      })
    );

    const snapshot = mocks.actionIndex.snapshot();
    expect(snapshot.totals.received).toBe(1);
    expect(snapshot.totals.configurationBuilt).toBe(1);
    expect(snapshot.totals.zGateValidated).toBe(1);
    expect(snapshot.totals.failed).toBe(1);
    expect(snapshot.totals.executionFailed).toBe(1);
    expect(snapshot.totals.polarityNegative).toBe(1);
    expect(snapshot.byIntent.LOGIN).toBe(1);
    expect(snapshot.byCapability['auth:login']).toBe(1);
    expect(snapshot.byCapability['session:create']).toBe(1);
    expect(snapshot.byFailureReason['Invalid context primitive: route is required']).toBe(1);
  });

  test('halts execution when constraints are not permitted', () => {
    const validation: ValidationResult = { valid: true, errors: [] };
    const constraints: ConstraintResult = { decision: 'REJECTED', reasons: ['trust_level_too_low'] };
    const execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>> = {
      success: true,
      output: {
        executionId: 'unused',
        actionType: 'LOGIN',
        outputHash: 'unused',
        payload: {},
      },
    };

    const { pipeline, mocks } = buildPipeline({ validation, constraints, execution });
    const result = pipeline.run(actionRequest);

    expect(mocks.executionController.execute).not.toHaveBeenCalled();
    expect(result.eventHash).toBe(createEventHash(configuration));
    expect(result.polarity).toBe('-');
    expect(result.execution).toEqual({
      success: false,
      error: 'Fail closed: constraint decision REJECTED',
    });

    expect(mocks.telemetryRecorder.record).toHaveBeenCalledTimes(2);
    expect(mocks.telemetryRecorder.record).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'configurationAccepted' })
    );
    expect(mocks.telemetryRecorder.record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'constraintViolation',
        details: {
          decision: 'REJECTED',
          reasons: 'trust_level_too_low',
        },
      })
    );

    const snapshot = mocks.actionIndex.snapshot();
    expect(snapshot.totals.constraintEvaluated).toBe(1);
    expect(snapshot.totals.failed).toBe(1);
    expect(snapshot.totals.executionFailed).toBe(1);
    expect(snapshot.totals.executionStarted).toBe(0);
    expect(snapshot.totals.polarityNegative).toBe(1);
    expect(snapshot.byFailureReason.trust_level_too_low).toBe(1);
  });

  test('records execution failure when execution controller returns an error', () => {
    const validation: ValidationResult = { valid: true, errors: [] };
    const constraints: ConstraintResult = { decision: 'PERMITTED', reasons: [] };
    const execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>> = {
      success: false,
      error: 'atomic unit failed',
    };

    const { pipeline, mocks } = buildPipeline({ validation, constraints, execution });
    const result = pipeline.run(actionRequest);

    expect(mocks.executionController.execute).toHaveBeenCalledWith(configuration, validation, constraints);
    expect(result.eventHash).toBe(createEventHash(configuration));
    expect(result.polarity).toBe('-');
    expect(result.execution).toEqual(execution);

    expect(mocks.telemetryRecorder.record).toHaveBeenCalledTimes(3);
    expect(mocks.telemetryRecorder.record).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'configurationAccepted' })
    );
    expect(mocks.telemetryRecorder.record).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'executionStarted' })
    );
    expect(mocks.telemetryRecorder.record).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'executionFailed',
        details: { error: 'atomic unit failed' },
      })
    );

    const snapshot = mocks.actionIndex.snapshot();
    expect(snapshot.totals.executionStarted).toBe(1);
    expect(snapshot.totals.failed).toBe(1);
    expect(snapshot.totals.executionFailed).toBe(1);
    expect(snapshot.totals.polarityNegative).toBe(1);
    expect(snapshot.byFailureReason['atomic unit failed']).toBe(1);
  });

  test('records successful execution and positive polarity', () => {
    const validation: ValidationResult = { valid: true, errors: [] };
    const constraints: ConstraintResult = { decision: 'PERMITTED', reasons: [] };
    const execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>> = {
      success: true,
      output: {
        executionId: 'exec-123',
        actionType: 'LOGIN',
        outputHash: 'hash-1',
        payload: { token: 'abc' },
      },
    };

    const { pipeline, mocks } = buildPipeline({ validation, constraints, execution });
    const result = pipeline.run(actionRequest);

    expect(result.eventHash).toBe(createEventHash(configuration));
    expect(result.polarity).toBe('+');
    expect(result.execution).toEqual(execution);

    expect(mocks.telemetryRecorder.record).toHaveBeenCalledTimes(3);
    expect(mocks.telemetryRecorder.record).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'executionCompleted',
        executionId: 'exec-123',
      })
    );

    const snapshot = mocks.actionIndex.snapshot();
    expect(snapshot.totals.passed).toBe(1);
    expect(snapshot.totals.executionCompleted).toBe(1);
    expect(snapshot.totals.executionFailed).toBe(0);
    expect(snapshot.totals.polarityPositive).toBe(1);
    expect(snapshot.totals.failed).toBe(0);
  });
});