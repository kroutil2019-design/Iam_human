import {
  assertAttackSurfaceModelIntegrity,
  createAttackSurfaceModel,
  getAttackSurfaceReductionSummary,
} from '../../substrate/attack-surface-model';

describe('attack-surface-model', () => {
  test('enumerates exactly 42 original attack classes and exactly 3 residual classes', () => {
    const model = createAttackSurfaceModel();
    expect(model.originalCategoryCount).toBe(42);
    expect(model.attackClasses).toHaveLength(42);
    expect(model.finalResidualCategoryCount).toBe(3);
    expect(model.residualCategories).toHaveLength(3);
  });

  test('asserts model integrity and explicit residual coverage', () => {
    expect(() => assertAttackSurfaceModelIntegrity()).not.toThrow();
  });

  test('reduction summary is 42 total to 3 residual with 39 eliminated', () => {
    const summary = getAttackSurfaceReductionSummary();
    expect(summary.total).toBe(42);
    expect(summary.residual).toBe(3);
    expect(summary.eliminated).toBe(39);
    expect(summary.residualByCategory.ProofIntegritySurface).toBe(1);
    expect(summary.residualByCategory.InputAmbiguitySurface).toBe(1);
    expect(summary.residualByCategory.ExecutionEnvironmentIntegritySurface).toBe(1);
  });

  test('every eliminated class documents construction-level elimination invariant', () => {
    const model = createAttackSurfaceModel();
    const eliminated = model.attackClasses.filter((item) => item.status === 'eliminated');
    expect(eliminated).toHaveLength(39);

    for (const item of eliminated) {
      expect(item.existedBefore.length).toBeGreaterThan(10);
      expect(item.architecturalChange.length).toBeGreaterThan(10);
      expect(item.invariant.length).toBeGreaterThan(10);
    }
  });
});
