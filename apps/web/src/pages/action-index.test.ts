import { describe, expect, it } from 'vitest';
import { normalizeActionIndex } from './action-index.ts';

describe('dashboard action index normalization', () => {
  it('handles successful payload safely', () => {
    const normalized = normalizeActionIndex({
      totals: {
        received: 12,
        configurationBuilt: 12,
        zGateValidated: 12,
        constraintEvaluated: 12,
        passed: 9,
        failed: 3,
        polarityPositive: 9,
        polarityNegative: 3,
        executionStarted: 9,
        executionCompleted: 9,
        executionFailed: 3,
      },
      byIntent: { AUTH_CHALLENGE: 8, PROOF_VERIFY: 4 },
      byCapability: { 'auth:challenge': 8 },
      byFailureReason: { 'Policy constraint failure': 3 },
    });

    expect(normalized.totals.received).toBe(12);
    expect(normalized.totals.passed).toBe(9);
    expect(normalized.totals.failed).toBe(3);
    expect(normalized.totals.polarityPositive).toBe(9);
    expect(normalized.totals.polarityNegative).toBe(3);
    expect(normalized.byIntent.AUTH_CHALLENGE).toBe(8);
    expect(normalized.byFailureReason['Policy constraint failure']).toBe(3);
  });

  it('falls back to safe defaults for malformed payloads', () => {
    const normalized = normalizeActionIndex({ totals: null, byIntent: null });

    expect(normalized.totals.received).toBe(0);
    expect(normalized.totals.passed).toBe(0);
    expect(normalized.totals.failed).toBe(0);
    expect(normalized.byIntent).toEqual({});
    expect(normalized.byFailureReason).toEqual({});
  });
});
