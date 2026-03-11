import { generateKeyPairSync, sign } from 'crypto';
import { ActionRequest } from '../../execution/models';
import {
  AttackSurfaceKernel,
  ExecutionReceipt,
  KernelExecutionResult,
} from '../../substrate/attack-surface-kernel';
import { TrustProof, createCanonicalRequest, createRequestEventHash } from '../../substrate/trust-proof';
import { stableStringify } from '../../substrate/canonicalization';

describe('attack-surface-kernel', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const actorPublicKey = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

  function baseRequest(): ActionRequest {
    return {
      device: { deviceId: 'kernel-dev-1', publicKey: actorPublicKey },
      identity: { actorId: 'kernel-user-1' },
      intent: { actionType: 'AUTH_CHALLENGE' },
      legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
      context: { route: '/auth/challenge' },
      capability: { permissions: ['auth:challenge'] },
      payload: { nonce: 'kernel-nonce-1' },
    };
  }

  function withProof(request: ActionRequest): ActionRequest {
    const canonicalRequest = createCanonicalRequest(request);
    const eventHash = createRequestEventHash(request);
    const capabilityScope = [...(request.capability.permissions ?? [])].sort((a, b) => a.localeCompare(b));
    const message = `${eventHash}:${stableStringify(capabilityScope)}`;
    const actorSignature = sign(null, Buffer.from(message, 'utf8'), privateKey).toString('base64');

    const trustProof: TrustProof = {
      eventHash,
      actorSignature,
      capabilityScope,
      canonicalRequest,
    };

    return {
      ...request,
      payload: {
        ...request.payload,
        trustProof,
      },
    };
  }

  test('valid request admits deterministically and yields replay-verifiable receipt', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());

    const result = kernel.execute(request);
    expect(result.success).toBe(true);
    expect(result.admissionDecision).toBe('admitted');
    expect(result.receipt.eventHash).toBe(result.eventHash);
    expect(kernel.verifyReplayableReceipt(request, result.receipt)).toBe(true);
  });

  test('tampered input is rejected before execution', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());
    const tampered: ActionRequest = {
      ...request,
      context: {
        ...request.context,
        route: '/auth/tampered',
      },
    };

    const result = kernel.execute(tampered);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Canonical request mismatch');
    expect(result.residualRiskCategory).toBe('InputAmbiguitySurface');
  });

  test('tampered proof signature is rejected as proof integrity surface', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());
    const tampered: ActionRequest = {
      ...request,
      payload: {
        ...request.payload,
        trustProof: {
          ...(request.payload.trustProof as TrustProof),
          actorSignature: 'tampered-signature',
        },
      },
    };

    const result = kernel.execute(tampered);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid actor signature');
    expect(result.residualRiskCategory).toBe('ProofIntegritySurface');
  });

  test('capability widening is rejected by construction', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());
    const widenedBase: ActionRequest = {
      ...request,
      capability: {
        ...request.capability,
        permissions: ['auth:challenge', 'admin:proof:invalidate'],
      },
      payload: {
        ...request.payload,
      },
    };

    const canonicalRequest = createCanonicalRequest(widenedBase);
    const eventHash = createRequestEventHash(widenedBase);
    const narrowedScope = ['auth:challenge'];
    const message = `${eventHash}:${stableStringify(narrowedScope)}`;
    const actorSignature = sign(null, Buffer.from(message, 'utf8'), privateKey).toString('base64');

    const widened: ActionRequest = {
      ...widenedBase,
      payload: {
        ...widenedBase.payload,
        trustProof: {
          eventHash,
          actorSignature,
          capabilityScope: narrowedScope,
          canonicalRequest,
        },
      },
    };

    const result = kernel.execute(widened);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Capability scope mismatch');
    expect(result.residualRiskCategory).toBe('InputAmbiguitySurface');
  });

  test('deterministic admission decision is identical for identical input and proof', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());

    jest.useFakeTimers({ now: new Date('2026-03-11T00:00:00.000Z') });

    const first = kernel.execute(request);
    const second = kernel.execute(request);

    jest.useRealTimers();

    expect(first.admissionDecision).toBe(second.admissionDecision);
    expect(first.success).toBe(second.success);
    expect(first.eventHash).toBe(second.eventHash);
    expect(first.receipt.receiptId).toBe(second.receipt.receiptId);
  });

  test('ambiguous canonical forms are rejected', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());
    const ambiguous: ActionRequest = {
      ...request,
      payload: {
        ...request.payload,
        trust_proof: request.payload.trustProof,
      },
    };

    const result = kernel.execute(ambiguous);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Ambiguous proof container');
    expect(result.residualRiskCategory).toBe('InputAmbiguitySurface');
  });

  test('nondeterministic execution output paths are isolated by integrity checks', () => {
    const maliciousKernel = new AttackSurfaceKernel(() => ({
      eventHash: 'ignored',
      polarity: '+',
      validation: { valid: true, errors: [] },
      constraints: { decision: 'PERMITTED', reasons: [] },
      configuration: {
        device: { deviceId: 'kernel-dev-1', publicKey: actorPublicKey },
        identity: { actorId: 'kernel-user-1', actorType: 'user' },
        intent: { actionType: 'AUTH_CHALLENGE', requestedAt: 'x', deterministicKey: 'k' },
        legitimacy: { authMethod: 'jwt', trustLevel: 'medium', evidence: ['e'] },
        context: { route: '/auth/challenge', timestamp: 'x' },
        capability: { permissions: ['auth:challenge'], constraintsVersion: '1.0.0' },
        payload: {},
      },
      execution: {
        success: true,
        output: {
          executionId: '00000000000000000000000000000000',
          actionType: 'AUTH_CHALLENGE',
          outputHash: 'bad-output-hash',
          payload: {},
        },
      },
    }));

    const request = withProof(baseRequest());
    const result = maliciousKernel.execute(request);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Execution integrity failure');
    expect(result.residualRiskCategory).toBe('ExecutionEnvironmentIntegritySurface');
  });

  test('identical inputs produce identical receipts', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());

    jest.useFakeTimers({ now: new Date('2026-03-11T00:00:00.000Z') });

    const resultA = kernel.execute(request);
    const resultB = kernel.execute(request);

    jest.useRealTimers();

    expect(resultA.success).toBe(true);
    expect(resultB.success).toBe(true);
    expect(resultA.receipt.receiptId).toBe(resultB.receipt.receiptId);
    expect(resultA.receipt.outcomeDigest).toBe(resultB.receipt.outcomeDigest);
  });

  test('eliminated classes cannot re-enter via extension options', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());

    const result = kernel.execute(request, { allowExternalAdmissionExtension: true });
    expect(result.success).toBe(false);
    expect(result.error).toContain('External admission extensions are disabled');
    expect(result.residualRiskCategory).toBe('ExecutionEnvironmentIntegritySurface');
  });

  test('all residual categories are explicitly covered by kernel outcomes', () => {
    const kernel = new AttackSurfaceKernel();
    const base = withProof(baseRequest());
    const categories = new Set<string>();

    const proofForgery = kernel.execute({
      ...base,
      payload: {
        ...base.payload,
        trustProof: {
          ...(base.payload.trustProof as TrustProof),
          actorSignature: 'tampered-signature',
        },
      },
    });
    categories.add(proofForgery.residualRiskCategory || '');

    const inputAmbiguity = kernel.execute({
      ...base,
      payload: {
        ...base.payload,
        trust_proof: base.payload.trustProof,
      },
    });
    categories.add(inputAmbiguity.residualRiskCategory || '');

    const environmentRisk = kernel.execute(base, { allowExternalAdmissionExtension: true });
    categories.add(environmentRisk.residualRiskCategory || '');

    expect(categories.has('ProofIntegritySurface')).toBe(true);
    expect(categories.has('InputAmbiguitySurface')).toBe(true);
    expect(categories.has('ExecutionEnvironmentIntegritySurface')).toBe(true);
  });

  test('receipt replay verifier rejects modified receipt content', () => {
    const kernel = new AttackSurfaceKernel();
    const request = withProof(baseRequest());
    const result = kernel.execute(request);

    const tamperedReceipt: ExecutionReceipt = {
      ...result.receipt,
      outcomeDigest: 'tampered',
    };

    expect(kernel.verifyReplayableReceipt(request, result.receipt)).toBe(true);
    expect(kernel.verifyReplayableReceipt(request, tamperedReceipt)).toBe(false);
  });
});
