import { AtomicExecutionUnit } from './atomic-execution-unit';
import { ConfigurationBuilder } from './configuration-builder';
import { ConstraintEvaluator } from './constraint-evaluator';
import { DeterministicExecutionPipeline } from './pipeline';
import { ExecutionController } from './execution-controller';
import { TelemetryRecorder } from './telemetry-recorder';
import { ZGateValidator } from './z-gate-validator';
import { ActionIndex } from './action-index';
import { PolarityResolver } from './polarity-resolver';

const configurationBuilder = new ConfigurationBuilder();
const zGateValidator = new ZGateValidator();
const constraintEvaluator = new ConstraintEvaluator();
const atomicExecutionUnit = new AtomicExecutionUnit();
const executionController = new ExecutionController(atomicExecutionUnit);
const telemetryRecorder = new TelemetryRecorder();
export const actionIndex = new ActionIndex();
const polarityResolver = new PolarityResolver();

export const deterministicPipeline = new DeterministicExecutionPipeline(
  configurationBuilder,
  zGateValidator,
  constraintEvaluator,
  executionController,
  telemetryRecorder,
  actionIndex,
  polarityResolver
);

export * from './models';
export * from './event-hash';
