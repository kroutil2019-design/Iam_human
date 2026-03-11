import {
  ActionRequest,
  ConstraintResult,
  DeterministicOutput,
  ExecutionResult,
  PrimitiveConfiguration,
  ValidationResult,
} from './models';
import { ConfigurationBuilder } from './configuration-builder';
import { ZGateValidator } from './z-gate-validator';
import { ConstraintEvaluator } from './constraint-evaluator';
import { ExecutionController } from './execution-controller';
import { TelemetryRecorder } from './telemetry-recorder';
import { createEventHash } from './event-hash';
import { ActionIndex } from './action-index';
import { PolarityResolver, Polarity } from './polarity-resolver';

export interface PipelineResult {
  configuration?: PrimitiveConfiguration;
  polarity: Polarity;
  eventHash: string;
  validation: ValidationResult;
  constraints: ConstraintResult;
  execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>>;
}

export class DeterministicExecutionPipeline {
  constructor(
    private readonly configurationBuilder: ConfigurationBuilder,
    private readonly zGateValidator: ZGateValidator,
    private readonly constraintEvaluator: ConstraintEvaluator,
    private readonly executionController: ExecutionController,
    private readonly telemetryRecorder: TelemetryRecorder,
    private readonly actionIndex: ActionIndex,
    private readonly polarityResolver: PolarityResolver
  ) {}

  private trackPolarity(polarity: Polarity): void {
    if (polarity === '+') {
      this.actionIndex.incrementStage('polarityPositive');
      return;
    }

    this.actionIndex.incrementStage('polarityNegative');
  }

  run(actionRequest: ActionRequest): PipelineResult {
    this.actionIndex.incrementStage('received');

    const configuration = this.configurationBuilder.build(actionRequest);
    this.actionIndex.incrementStage('configurationBuilt');
    this.actionIndex.incrementIntent(configuration.intent.actionType);
    this.actionIndex.incrementCapabilities(configuration.capability.permissions);

    const validation = this.zGateValidator.validate(configuration);
    this.actionIndex.incrementStage('zGateValidated');

    if (!validation.valid) {
      const eventHash = createEventHash(configuration);
      const reason = validation.errors.join('; ') || 'Validation failed';
      const constraints: ConstraintResult = { decision: 'HALT', reasons: ['Validation failed'] };
      const execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>> = {
        success: false,
        error: 'Fail closed: primitive configuration rejected',
      };
      const polarity = this.polarityResolver.resolve({
        validation,
        constraints,
        executionSuccess: execution.success,
      });

      this.telemetryRecorder.record({
        type: 'configurationRejected',
        timestamp: new Date().toISOString(),
        actorId: configuration.identity.actorId,
        actionType: configuration.intent.actionType,
        details: { reason },
      });

      this.actionIndex.incrementStage('failed');
      this.actionIndex.incrementStage('executionFailed');
      this.actionIndex.incrementFailureReason(reason);
      this.trackPolarity(polarity);

      return {
        configuration,
        polarity,
        eventHash,
        validation,
        constraints,
        execution,
      };
    }

    this.telemetryRecorder.record({
      type: 'configurationAccepted',
      timestamp: new Date().toISOString(),
      actorId: configuration.identity.actorId,
      actionType: configuration.intent.actionType,
    });

    const constraints = this.constraintEvaluator.evaluate(configuration);
    this.actionIndex.incrementStage('constraintEvaluated');

    if (constraints.decision !== 'PERMITTED') {
      const eventHash = createEventHash(configuration);
      const reason = constraints.reasons.join('; ') || `Constraint decision ${constraints.decision}`;
      const execution: ExecutionResult<DeterministicOutput<Record<string, unknown>>> = {
        success: false,
        error: `Fail closed: constraint decision ${constraints.decision}`,
      };
      const polarity = this.polarityResolver.resolve({
        validation,
        constraints,
        executionSuccess: execution.success,
      });

      this.telemetryRecorder.record({
        type: 'constraintViolation',
        timestamp: new Date().toISOString(),
        actorId: configuration.identity.actorId,
        actionType: configuration.intent.actionType,
        details: { decision: constraints.decision, reasons: reason },
      });

      this.actionIndex.incrementStage('failed');
      this.actionIndex.incrementStage('executionFailed');
      this.actionIndex.incrementFailureReason(reason);
      this.trackPolarity(polarity);

      return {
        configuration,
        polarity,
        eventHash,
        validation,
        constraints,
        execution,
      };
    }
    const eventHash = createEventHash(configuration);
    this.actionIndex.incrementStage('executionStarted');

    this.telemetryRecorder.record({
      type: 'executionStarted',
      timestamp: new Date().toISOString(),
      actorId: configuration.identity.actorId,
      actionType: configuration.intent.actionType,
    });

    const execution = this.executionController.execute(configuration, validation, constraints);
    const polarity = this.polarityResolver.resolve({
      validation,
      constraints,
      executionSuccess: execution.success,
    });

    if (!execution.success) {
      this.telemetryRecorder.record({
        type: 'executionFailed',
        timestamp: new Date().toISOString(),
        actorId: configuration.identity.actorId,
        actionType: configuration.intent.actionType,
        details: { error: execution.error ?? 'unknown_error' },
      });

      this.actionIndex.incrementStage('failed');
      this.actionIndex.incrementStage('executionFailed');
      this.actionIndex.incrementFailureReason(execution.error ?? 'Execution failed');
      this.trackPolarity(polarity);
    } else {
      this.telemetryRecorder.record({
        type: 'executionCompleted',
        timestamp: new Date().toISOString(),
        actorId: configuration.identity.actorId,
        actionType: configuration.intent.actionType,
        executionId: execution.output?.executionId,
      });

      this.actionIndex.incrementStage('passed');
      this.actionIndex.incrementStage('executionCompleted');
      this.trackPolarity(polarity);
    }

    return {
      configuration,
      polarity,
      eventHash,
      validation,
      constraints,
      execution,
    };
  }
}
