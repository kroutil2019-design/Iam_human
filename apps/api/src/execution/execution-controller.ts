import {
  ConstraintResult,
  DeterministicOutput,
  ExecutionResult,
  PrimitiveConfiguration,
  ValidationResult,
} from './models';
import { AtomicExecutionUnit } from './atomic-execution-unit';

export class ExecutionController {
  constructor(private readonly executionUnit: AtomicExecutionUnit) {}

  execute(
    configuration: PrimitiveConfiguration,
    validation: ValidationResult,
    constraints: ConstraintResult
  ): ExecutionResult<DeterministicOutput<Record<string, unknown>>> {
    if (!validation.valid) {
      return {
        success: false,
        error: 'Execution blocked: invalid primitive configuration',
      };
    }

    if (constraints.decision !== 'PERMITTED') {
      return {
        success: false,
        error: `Execution blocked by constraints: ${constraints.decision}`,
      };
    }

    const output = this.executionUnit.run(
      configuration.device,
      configuration.identity,
      configuration.intent,
      configuration.legitimacy,
      configuration.context,
      configuration.capability
    );

    return {
      success: true,
      output,
    };
  }
}
