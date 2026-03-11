import { generateKeyPairSync, sign } from 'crypto';
import { ActionRequest } from '../../execution/models';
import { SubstrateRuntime } from '../../substrate/substrate-runtime';
import {
  TrustProof,
  createCanonicalRequest,
  createRequestEventHash,
  verifyTrustProof,
} from '../../substrate/trust-proof';
import { stableStringify } from '../../substrate/canonicalization';

describe('trust-proof', () => {
  const runtime = new SubstrateRuntime();
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const actorPublicKey = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

  beforeEach(() => {
    runtime.resetState();
  });

  function buildRequest(): ActionRequest {
    return {
      device: { deviceId: 'trust-dev-1', publicKey: actorPublicKey },
      identity: { actorId: 'trust-user-1' },
      intent: { actionType: 'AUTH_CHALLENGE' },
      legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
      context: { route: '/auth/challenge' },
      capability: { permissions: ['auth:challenge'] },
      payload: { nonce: 'trust-nonce-1' },
    };
  }

  function buildProof(request: ActionRequest): TrustProof {
    const canonicalRequest = createCanonicalRequest(request);
    const eventHash = createRequestEventHash(request);
    const capabilityScope = [...(request.capability.permissions ?? [])].sort((a, b) =>
      a.localeCompare(b)
    );
    const message = `${eventHash}:${stableStringify(capabilityScope)}`;
    const actorSignature = sign(null, Buffer.from(message, 'utf8'), privateKey).toString('base64');

    return {
      eventHash,
      actorSignature,
      capabilityScope,
      canonicalRequest,
    };
  }

  function withProof(request: ActionRequest): ActionRequest {
    return {
      ...request,
      payload: {
        ...request.payload,
        trustProof: buildProof(request),
      },
    };
  }

  test('valid proof verifies and executes successfully', () => {
    const request = withProof(buildRequest());
    const verification = verifyTrustProof(request);
    const result = runtime.run(request);

    expect(verification.valid).toBe(true);
    expect(result.success).toBe(true);
    expect(result.eventHash).toBe(createRequestEventHash(request));
  });

  test('tampered signature is rejected deterministically', () => {
    const request = withProof(buildRequest());
    const tampered = {
      ...request,
      payload: {
        ...request.payload,
        trustProof: {
          ...(request.payload.trustProof as TrustProof),
          actorSignature: 'tampered-signature',
        },
      },
    } as ActionRequest;

    const result1 = runtime.run(tampered);
    const result2 = runtime.run(tampered);

    expect(result1.success).toBe(false);
    expect(result2.success).toBe(false);
    expect(result1.error).toContain('Invalid actor signature');
    expect(result1.eventHash).toBe(result2.eventHash);
    expect(result1.executionId).toBe(result2.executionId);
  });

  test('tampered capability scope is rejected', () => {
    const request = withProof(buildRequest());
    const tampered = {
      ...request,
      payload: {
        ...request.payload,
        trustProof: {
          ...(request.payload.trustProof as TrustProof),
          capabilityScope: ['proof:issue'],
        },
      },
    } as ActionRequest;

    const verification = verifyTrustProof(tampered);
    const result = runtime.run(tampered);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('Capability scope mismatch');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Capability scope mismatch');
  });

  test('tampered canonical request hash is rejected', () => {
    const request = withProof(buildRequest());
    const tampered = {
      ...request,
      payload: {
        ...request.payload,
        trustProof: {
          ...(request.payload.trustProof as TrustProof),
          canonicalRequest: 'tampered-canonical-request',
        },
      },
    } as ActionRequest;

    const verification = verifyTrustProof(tampered);

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('Canonical request mismatch');
  });
});
