import { PolarityResolver } from '../../execution/polarity-resolver';
import { ConstraintResult, ValidationResult } from '../../execution/models';

describe('PolarityResolver', () => {
  const resolver = new PolarityResolver();

  const validValidation: ValidationResult = { valid: true, errors: [] };
  const invalidValidation: ValidationResult = { valid: false, errors: ['Invalid primitive'] };
  const missingPrimitiveValidation: ValidationResult = {
    valid: false,
    errors: ['Missing primitive: device'],
  };
  const permittedConstraints: ConstraintResult = { decision: 'PERMITTED', reasons: [] };
  const rejectedConstraints: ConstraintResult = {
    decision: 'REJECTED',
    reasons: ['Policy constraint failure'],
  };

  it('returns + for valid event', () => {
    const polarity = resolver.resolve({
      validation: validValidation,
      constraints: permittedConstraints,
      executionSuccess: true,
    });

    expect(polarity).toBe('+');
  });

  it('returns - for invalid primitive', () => {
    const polarity = resolver.resolve({
      validation: invalidValidation,
      constraints: permittedConstraints,
      executionSuccess: false,
    });

    expect(polarity).toBe('-');
  });

  it('returns - for failed constraint', () => {
    const polarity = resolver.resolve({
      validation: validValidation,
      constraints: rejectedConstraints,
      executionSuccess: false,
    });

    expect(polarity).toBe('-');
  });

  it('returns - for missing primitive configuration', () => {
    const polarity = resolver.resolve({
      validation: missingPrimitiveValidation,
      constraints: { decision: 'HALT', reasons: ['Validation failed'] },
      executionSuccess: false,
    });

    expect(polarity).toBe('-');
  });
});
