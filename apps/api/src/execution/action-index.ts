export type ActionIndexStage =
  | 'received'
  | 'configurationBuilt'
  | 'zGateValidated'
  | 'constraintEvaluated'
  | 'passed'
  | 'failed'
  | 'polarityPositive'
  | 'polarityNegative'
  | 'executionStarted'
  | 'executionCompleted'
  | 'executionFailed';

export interface ActionIndexSnapshot {
  totals: Record<ActionIndexStage, number>;
  byIntent: Record<string, number>;
  byCapability: Record<string, number>;
  byFailureReason: Record<string, number>;
}

const INITIAL_TOTALS: Record<ActionIndexStage, number> = {
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

export class ActionIndex {
  private totals: Record<ActionIndexStage, number> = { ...INITIAL_TOTALS };
  private byIntent: Record<string, number> = {};
  private byCapability: Record<string, number> = {};
  private byFailureReason: Record<string, number> = {};

  incrementStage(stage: ActionIndexStage): void {
    this.totals[stage] += 1;
  }

  incrementIntent(intent: string | undefined): void {
    const normalizedIntent = intent?.trim();
    if (!normalizedIntent) {
      return;
    }
    this.byIntent[normalizedIntent] = (this.byIntent[normalizedIntent] ?? 0) + 1;
  }

  incrementCapabilities(capabilities: string[] | undefined): void {
    if (!capabilities || capabilities.length === 0) {
      return;
    }

    for (const capability of capabilities) {
      const normalizedCapability = capability.trim();
      if (!normalizedCapability) {
        continue;
      }
      this.byCapability[normalizedCapability] = (this.byCapability[normalizedCapability] ?? 0) + 1;
    }
  }

  incrementFailureReason(reason: string | undefined): void {
    const normalizedReason = reason?.trim();
    if (!normalizedReason) {
      return;
    }

    this.byFailureReason[normalizedReason] = (this.byFailureReason[normalizedReason] ?? 0) + 1;
  }

  snapshot(): ActionIndexSnapshot {
    return {
      totals: { ...this.totals },
      byIntent: { ...this.byIntent },
      byCapability: { ...this.byCapability },
      byFailureReason: { ...this.byFailureReason },
    };
  }

  reset(): void {
    this.totals = { ...INITIAL_TOTALS };
    this.byIntent = {};
    this.byCapability = {};
    this.byFailureReason = {};
  }
}
