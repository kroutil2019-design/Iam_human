export interface ActionIndexTotals {
  received: number;
  configurationBuilt: number;
  zGateValidated: number;
  constraintEvaluated: number;
  passed: number;
  failed: number;
  polarityPositive: number;
  polarityNegative: number;
  executionStarted: number;
  executionCompleted: number;
  executionFailed: number;
}

export interface ActionIndexSnapshot {
  totals: ActionIndexTotals;
  byIntent: Record<string, number>;
  byCapability: Record<string, number>;
  byFailureReason: Record<string, number>;
}

const EMPTY_TOTALS: ActionIndexTotals = {
  received: 0,
  configurationBuilt: 0,
  zGateValidated: 0,
  constraintEvaluated: 0,
  passed: 0,
  failed: 0,
  polarityPositive: 0,
  polarityNegative: 0,
  executionStarted: 0,
  executionCompleted: 0,
  executionFailed: 0,
};

export const EMPTY_ACTION_INDEX: ActionIndexSnapshot = {
  totals: { ...EMPTY_TOTALS },
  byIntent: {},
  byCapability: {},
  byFailureReason: {},
};

function toSafeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function normalizeActionIndex(payload: unknown): ActionIndexSnapshot {
  if (!payload || typeof payload !== 'object') {
    return { ...EMPTY_ACTION_INDEX, totals: { ...EMPTY_TOTALS } };
  }

  const source = payload as Partial<ActionIndexSnapshot>;
  const sourceTotals = source.totals as Partial<ActionIndexTotals> | undefined;

  return {
    totals: {
      received: toSafeNumber(sourceTotals?.received),
      configurationBuilt: toSafeNumber(sourceTotals?.configurationBuilt),
      zGateValidated: toSafeNumber(sourceTotals?.zGateValidated),
      constraintEvaluated: toSafeNumber(sourceTotals?.constraintEvaluated),
      passed: toSafeNumber(sourceTotals?.passed),
      failed: toSafeNumber(sourceTotals?.failed),
      polarityPositive: toSafeNumber(sourceTotals?.polarityPositive),
      polarityNegative: toSafeNumber(sourceTotals?.polarityNegative),
      executionStarted: toSafeNumber(sourceTotals?.executionStarted),
      executionCompleted: toSafeNumber(sourceTotals?.executionCompleted),
      executionFailed: toSafeNumber(sourceTotals?.executionFailed),
    },
    byIntent: source.byIntent && typeof source.byIntent === 'object'
      ? source.byIntent
      : {},
    byCapability: source.byCapability && typeof source.byCapability === 'object'
      ? source.byCapability
      : {},
    byFailureReason: source.byFailureReason && typeof source.byFailureReason === 'object'
      ? source.byFailureReason
      : {},
  };
}

export async function fetchActionIndex(adminKey: string): Promise<ActionIndexSnapshot> {
  const res = await fetch('/actions/index', {
    headers: {
      'x-admin-key': adminKey,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = await res.json();
  return normalizeActionIndex(json);
}

export function topEntries(source: Record<string, number>, limit = 3): Array<[string, number]> {
  return Object.entries(source)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}
