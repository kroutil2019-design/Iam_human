import { ConstraintResult, ValidationResult } from './models';

export type Polarity = '+' | '-';

interface ResolvePolarityInput {
  validation: ValidationResult;
  constraints: ConstraintResult;
  executionSuccess: boolean;
}

export class PolarityResolver {
  resolve(input: ResolvePolarityInput): Polarity {
    if (!input.validation.valid) {
      return '-';
    }

    if (input.constraints.decision !== 'PERMITTED') {
      return '-';
    }

    if (!input.executionSuccess) {
      return '-';
    }

    return '+';
  }
}
