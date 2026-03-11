/**
 * Deterministic substrate runtime.
 * Orchestrates the deterministic execution pipeline with canonical stages:
 * ActionRequest → Canonicalization → Validation → Constraints → Execution → Deterministic Result
 */

import { ActionRequest } from '../execution/models';
import { deterministicPipeline, actionIndex } from '../execution';
import { createEventHash } from './event-hash';
import { DeterministicState, ExecutionSnapshot } from './deterministic-state';

/**
 * Result of a deterministic execution.
 * Guaranteed to be identical for identical inputs (modulo timestamps).
 */
export interface DeterministicResult {
  success: boolean;
  eventHash: string;
  executionId: string;
  output?: {
    executionId: string;
    actionType: string;
    outputHash: string;
    payload?: Record<string, unknown>;
  };
  error?: string;
}

/**
 * Deterministic substrate runtime.
 * Encapsulates the execution pipeline with deterministic guarantees.
 */
export class SubstrateRuntime {
  private determinismState: DeterministicState;

  constructor(determinismState?: DeterministicState) {
    this.determinismState = determinismState || new DeterministicState();
  }

  /**
   * Execute a request through the deterministic pipeline.
   * Returns a result that is guaranteed to be identical for identical requests
   * (modulo timestamps and other volatile fields).
   */
  run(request: ActionRequest): DeterministicResult {
    const result = deterministicPipeline.run(request);
    const eventHash = result.eventHash;
    const executionId = result.execution.output?.executionId || eventHash.substring(0, 32);

    // Record execution snapshot for determinism tracking
    if (result.configuration) {
      this.determinismState.recordSnapshot({
        executionId,
        eventHash,
        stage: result.execution.success ? 'executionCompleted' : 'executionFailed',
        timestamp: new Date().toISOString(),
        actorId: result.configuration.identity.actorId,
        actionType: result.configuration.intent.actionType,
        result: result.execution.success ? 'success' : 'execution_failed',
        details: result.execution.output ? (result.execution.output as unknown as Record<string, unknown>) : {},
      });
    }

    return {
      success: result.execution.success,
      eventHash,
      executionId,
      output: result.execution.output as any,
      error: result.execution.error,
    };
  }

  /**
   * Get the current action index snapshot.
   */
  getActionIndex() {
    return actionIndex.snapshot();
  }

  /**
   * Get determinism state metrics.
   */
  getDeterminismMetrics() {
    return this.determinismState.getMetrics();
  }

  /**
   * Reset state (for test isolation).
   */
  resetState(): void {
    actionIndex.reset();
    this.determinismState.reset();
  }
}

/**
 * Global substrate runtime instance.
 */
export const globalSubstrateRuntime = new SubstrateRuntime();
