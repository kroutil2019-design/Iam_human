/**
 * Deterministic substrate runtime.
 * Orchestrates the deterministic execution pipeline with canonical stages:
 * ActionRequest → Canonicalization → Validation → Constraints → Execution → Deterministic Result
 */

import { ActionRequest } from '../execution/models';
import { actionIndex } from '../execution';
import { DeterministicState } from './deterministic-state';
import { AttackSurfaceKernel, ExecutionReceipt, globalAttackSurfaceKernel } from './attack-surface-kernel';
import { ResidualAttackCategory } from './attack-surface-model';

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
  receipt: ExecutionReceipt;
  residualRiskCategory?: ResidualAttackCategory;
}

/**
 * Deterministic substrate runtime.
 * Encapsulates the execution pipeline with deterministic guarantees.
 */
export class SubstrateRuntime {
  private determinismState: DeterministicState;
  private kernel: AttackSurfaceKernel;

  constructor(determinismState?: DeterministicState, kernel: AttackSurfaceKernel = globalAttackSurfaceKernel) {
    this.determinismState = determinismState || new DeterministicState();
    this.kernel = kernel;
  }

  /**
   * Execute a request through the deterministic pipeline.
   * Returns a result that is guaranteed to be identical for identical requests
   * (modulo timestamps and other volatile fields).
   */
  run(request: ActionRequest): DeterministicResult {
    const kernelResult = this.kernel.execute(request);
    if (!kernelResult.success) {
      this.determinismState.recordSnapshot({
        executionId: kernelResult.executionId,
        eventHash: kernelResult.eventHash,
        stage: 'validationFailed',
        timestamp: new Date().toISOString(),
        actorId: request.identity.actorId,
        actionType: request.intent.actionType,
        result: 'validation_failed',
        details: {
          error: kernelResult.error ?? 'Kernel admission rejected execution',
          residualRiskCategory: kernelResult.residualRiskCategory ?? 'InputAmbiguitySurface',
          receiptId: kernelResult.receipt.receiptId,
        },
      });

      return {
        success: false,
        eventHash: kernelResult.eventHash,
        executionId: kernelResult.executionId,
        error: kernelResult.error ?? 'Kernel admission rejected execution',
        receipt: kernelResult.receipt,
        residualRiskCategory: kernelResult.residualRiskCategory,
      };
    }

    // Record execution snapshot for determinism tracking
    this.determinismState.recordSnapshot({
      executionId: kernelResult.executionId,
      eventHash: kernelResult.eventHash,
      stage: kernelResult.success ? 'executionCompleted' : 'executionFailed',
      timestamp: new Date().toISOString(),
      actorId: request.identity.actorId,
      actionType: request.intent.actionType,
      result: kernelResult.success ? 'success' : 'execution_failed',
      details: {
        ...(kernelResult.output as unknown as Record<string, unknown>),
        receiptId: kernelResult.receipt.receiptId,
      },
    });

    return {
      success: kernelResult.success,
      eventHash: kernelResult.eventHash,
      executionId: kernelResult.executionId,
      output: kernelResult.output,
      error: kernelResult.error,
      receipt: kernelResult.receipt,
      residualRiskCategory: kernelResult.residualRiskCategory,
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
