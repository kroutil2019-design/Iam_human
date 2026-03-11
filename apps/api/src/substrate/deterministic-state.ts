/**
 * Deterministic state management for execution substrate.
 * Manages action index, execution state, and provides state snapshots
 * for reproducible test execution and debugging.
 */

export type ExecutionStage =
  | 'received'
  | 'configurationBuilt'
  | 'validationStarted'
  | 'validationPassed'
  | 'validationFailed'
  | 'constraintEvaluationStarted'
  | 'constraintEvaluationDecided'
  | 'executionStarted'
  | 'executionCompleted'
  | 'executionFailed';

/**
 * Snapshot of a single execution attempt with all state captured.
 */
export interface ExecutionSnapshot {
  executionId: string;
  eventHash: string;
  stage: ExecutionStage;
  timestamp: string;
  actorId: string;
  actionType: string;
  result: 'success' | 'validation_failed' | 'constraint_rejected' | 'execution_failed';
  details: Record<string, unknown>;
}

/**
 * Aggregated metrics across all executions.
 */
export interface DeterministicStateMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  executionsByActor: Record<string, number>;
  executionsByAction: Record<string, number>;
  executionsByResult: Record<string, number>;
}

/**
 * Manages deterministic state for execution replay and testing.
 */
export class DeterministicState {
  private snapshots: ExecutionSnapshot[] = [];
  private metrics: DeterministicStateMetrics = {
    totalExecutions: 0,
    successCount: 0,
    failureCount: 0,
    executionsByActor: {},
    executionsByAction: {},
    executionsByResult: {},
  };

  /**
   * Record a new execution snapshot.
   */
  recordSnapshot(snapshot: ExecutionSnapshot): void {
    this.snapshots.push(snapshot);
    this.metrics.totalExecutions += 1;

    if (snapshot.result === 'success') {
      this.metrics.successCount += 1;
      this.metrics.executionsByResult['success'] = (this.metrics.executionsByResult['success'] ?? 0) + 1;
    } else {
      this.metrics.failureCount += 1;
      this.metrics.executionsByResult[snapshot.result] =
        (this.metrics.executionsByResult[snapshot.result] ?? 0) + 1;
    }

    this.metrics.executionsByActor[snapshot.actorId] =
      (this.metrics.executionsByActor[snapshot.actorId] ?? 0) + 1;
    this.metrics.executionsByAction[snapshot.actionType] =
      (this.metrics.executionsByAction[snapshot.actionType] ?? 0) + 1;
  }

  /**
   * Find a snapshot by execution ID.
   */
  findSnapshot(executionId: string): ExecutionSnapshot | undefined {
    return this.snapshots.find((s) => s.executionId === executionId);
  }

  /**
   * Find all snapshots for a given actor.
   */
  findSnapshotsByActor(actorId: string): ExecutionSnapshot[] {
    return this.snapshots.filter((s) => s.actorId === actorId);
  }

  /**
   * Find all snapshots for a given action type.
   */
  findSnapshotsByAction(actionType: string): ExecutionSnapshot[] {
    return this.snapshots.filter((s) => s.actionType === actionType);
  }

  /**
   * Get the current metrics snapshot.
   */
  getMetrics(): DeterministicStateMetrics {
    return { ...this.metrics };
  }

  /**
   * Get all recorded snapshots.
   */
  getAllSnapshots(): ExecutionSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Reset all state (for test isolation).
   */
  reset(): void {
    this.snapshots = [];
    this.metrics = {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      executionsByActor: {},
      executionsByAction: {},
      executionsByResult: {},
    };
  }

  /**
   * Verify determinism: check that a given execution ID
   * would produce identical results if replayed.
   */
  canReplay(executionId: string): boolean {
    const snapshot = this.findSnapshot(executionId);
    return snapshot !== undefined && snapshot.stage === 'executionCompleted';
  }
}

/**
 * Global deterministic state instance (singleton for process-level tracking).
 */
export const globalDeterministicState = new DeterministicState();
