import { createHash } from 'crypto';
import { deterministicPipeline } from '../execution';
import { hashDeterministic } from '../execution/utils';
import { ActionRequest, DeterministicOutput } from '../execution/models';
import { stableStringify } from './canonicalization';
import {
  ResidualAttackCategory,
  assertAttackSurfaceModelIntegrity,
} from './attack-surface-model';
import { createCanonicalRequest, createRequestEventHash, verifyTrustProof } from './trust-proof';

export type AdmissionDecision = 'admitted' | 'rejected';

export interface ExecutionReceipt {
  receiptId: string;
  eventHash: string;
  executionId: string;
  canonicalRequest: string;
  capabilityScope: string[];
  decision: AdmissionDecision;
  outcomeDigest: string;
  residualRiskCategory?: ResidualAttackCategory;
}

export interface KernelExecutionResult {
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
  admissionDecision: AdmissionDecision;
  residualRiskCategory?: ResidualAttackCategory;
  receipt: ExecutionReceipt;
}

export interface KernelExecutionOptions {
  allowExternalAdmissionExtension?: boolean;
}

type PipelineResult = ReturnType<typeof deterministicPipeline.run>;
type PipelineRunner = (request: ActionRequest) => PipelineResult;

function digest(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function normalizeScope(scope: string[] | undefined): string[] {
  return [...(scope ?? [])].sort((a, b) => a.localeCompare(b));
}

function hasDuplicateScopeItems(scope: string[]): boolean {
  return new Set(scope).size !== scope.length;
}

function hasAmbiguousProofContainer(request: ActionRequest): boolean {
  const payload = request.payload as Record<string, unknown>;
  return payload.trustProof !== undefined && payload.trust_proof !== undefined;
}

export class AttackSurfaceKernel {
  constructor(private readonly pipelineRunner: PipelineRunner = (request) => deterministicPipeline.run(request)) {
    assertAttackSurfaceModelIntegrity();
  }

  execute(request: ActionRequest, options?: KernelExecutionOptions): KernelExecutionResult {
    if (options?.allowExternalAdmissionExtension) {
      return this.rejectedResult(
        request,
        'External admission extensions are disabled by kernel boundary checks',
        'ExecutionEnvironmentIntegritySurface'
      );
    }

    if (hasAmbiguousProofContainer(request)) {
      return this.rejectedResult(
        request,
        'Ambiguous proof container: both trustProof and trust_proof were provided',
        'InputAmbiguitySurface'
      );
    }

    const normalizedScope = normalizeScope(request.capability.permissions);
    if (hasDuplicateScopeItems(normalizedScope)) {
      return this.rejectedResult(
        request,
        'Ambiguous capability scope: duplicates are not admissible',
        'InputAmbiguitySurface'
      );
    }

    const trustVerification = verifyTrustProof(request);
    if (!trustVerification.valid) {
      const residual: ResidualAttackCategory = trustVerification.reason?.includes('signature')
        ? 'ProofIntegritySurface'
        : 'InputAmbiguitySurface';
      return this.rejectedResult(
        request,
        trustVerification.reason ?? 'Trust proof validation failed',
        residual,
        trustVerification.eventHash
      );
    }

    const pipelineResult = this.pipelineRunner(request);
    const eventHash = trustVerification.eventHash;
    const executionId = pipelineResult.execution.output?.executionId ?? eventHash.substring(0, 32);

    if (pipelineResult.execution.success) {
      const integrityFailure = this.verifyExecutionIntegrity(pipelineResult);
      if (integrityFailure) {
        return this.rejectedResult(
          request,
          integrityFailure,
          'ExecutionEnvironmentIntegritySurface',
          eventHash,
          executionId
        );
      }
    }

    const output = pipelineResult.execution.output as DeterministicOutput<Record<string, unknown>> | undefined;
    const success = pipelineResult.execution.success;
    const error = pipelineResult.execution.error;
    const residualRiskCategory = success ? undefined : this.mapExecutionFailureToResidual(error);

    const receipt = this.createReceipt({
      eventHash,
      executionId,
      request,
      decision: success ? 'admitted' : 'rejected',
      outcomeDigest: success ? output?.outputHash ?? digest('missing-output') : digest(error ?? 'execution-failed'),
      residualRiskCategory,
    });

    return {
      success,
      eventHash,
      executionId,
      output,
      error,
      admissionDecision: success ? 'admitted' : 'rejected',
      residualRiskCategory,
      receipt,
    };
  }

  verifyReplayableReceipt(request: ActionRequest, receipt: ExecutionReceipt): boolean {
    const expectedCanonicalRequest = createCanonicalRequest(request);
    const expectedEventHash = createRequestEventHash(request);
    const expectedScope = normalizeScope(request.capability.permissions);

    if (receipt.canonicalRequest !== expectedCanonicalRequest) {
      return false;
    }
    if (receipt.eventHash !== expectedEventHash) {
      return false;
    }
    if (stableStringify(receipt.capabilityScope) !== stableStringify(expectedScope)) {
      return false;
    }

    const recomputedId = digest({
      eventHash: receipt.eventHash,
      executionId: receipt.executionId,
      decision: receipt.decision,
      outcomeDigest: receipt.outcomeDigest,
      capabilityScope: receipt.capabilityScope,
      canonicalRequest: receipt.canonicalRequest,
      residualRiskCategory: receipt.residualRiskCategory,
    });

    return recomputedId === receipt.receiptId;
  }

  private verifyExecutionIntegrity(pipelineResult: PipelineResult): string | undefined {
    const configuration = pipelineResult.configuration;
    const output = pipelineResult.execution.output;
    if (!configuration || !output) {
      return 'Execution integrity failure: successful execution missing configuration or output';
    }

    const expectedOutputHash = hashDeterministic({
      device: configuration.device,
      identity: configuration.identity,
      intent: configuration.intent,
      legitimacy: configuration.legitimacy,
      context: configuration.context,
      capability: configuration.capability,
    });

    if (output.outputHash !== expectedOutputHash) {
      return 'Execution integrity failure: outputHash mismatch';
    }

    const expectedExecutionId = expectedOutputHash.slice(0, 32);
    if (output.executionId !== expectedExecutionId) {
      return 'Execution integrity failure: executionId mismatch';
    }

    return undefined;
  }

  private createReceipt(input: {
    eventHash: string;
    executionId: string;
    request: ActionRequest;
    decision: AdmissionDecision;
    outcomeDigest: string;
    residualRiskCategory?: ResidualAttackCategory;
  }): ExecutionReceipt {
    const canonicalRequest = createCanonicalRequest(input.request);
    const capabilityScope = normalizeScope(input.request.capability.permissions);

    const receiptId = digest({
      eventHash: input.eventHash,
      executionId: input.executionId,
      decision: input.decision,
      outcomeDigest: input.outcomeDigest,
      capabilityScope,
      canonicalRequest,
      residualRiskCategory: input.residualRiskCategory,
    });

    return {
      receiptId,
      eventHash: input.eventHash,
      executionId: input.executionId,
      canonicalRequest,
      capabilityScope,
      decision: input.decision,
      outcomeDigest: input.outcomeDigest,
      residualRiskCategory: input.residualRiskCategory,
    };
  }

  private rejectedResult(
    request: ActionRequest,
    error: string,
    residualRiskCategory: ResidualAttackCategory,
    knownEventHash?: string,
    knownExecutionId?: string
  ): KernelExecutionResult {
    const eventHash = knownEventHash ?? createRequestEventHash(request);
    const executionId = knownExecutionId ?? eventHash.substring(0, 32);
    const receipt = this.createReceipt({
      eventHash,
      executionId,
      request,
      decision: 'rejected',
      outcomeDigest: digest(error),
      residualRiskCategory,
    });

    return {
      success: false,
      eventHash,
      executionId,
      error,
      admissionDecision: 'rejected',
      residualRiskCategory,
      receipt,
    };
  }

  private mapExecutionFailureToResidual(error: string | undefined): ResidualAttackCategory {
    if (error?.toLowerCase().includes('constraint') || error?.toLowerCase().includes('validation')) {
      return 'InputAmbiguitySurface';
    }

    return 'ExecutionEnvironmentIntegritySurface';
  }
}

export const globalAttackSurfaceKernel = new AttackSurfaceKernel();
