import { createHash, createPublicKey, verify as verifySignature } from 'crypto';
import { ActionRequest } from '../execution/models';
import { canonicalize, stableStringify } from './canonicalization';

export interface TrustProof {
  eventHash: string;
  actorSignature: string;
  capabilityScope: string[];
  canonicalRequest: string;
}

export interface TrustProofVerificationResult {
  valid: boolean;
  eventHash: string;
  reason?: string;
}

function normalizeCapabilityScope(scope: string[]): string[] {
  return [...scope].sort((a, b) => a.localeCompare(b));
}

function withoutTrustProof(request: ActionRequest): ActionRequest {
  const payload = { ...request.payload };
  delete payload.trustProof;
  delete payload.trust_proof;

  return {
    ...request,
    payload,
  };
}

export function createCanonicalRequest(request: ActionRequest): string {
  const stripped = withoutTrustProof(request);
  return stableStringify(canonicalize(stripped));
}

export function createRequestEventHash(request: ActionRequest): string {
  const canonicalRequest = createCanonicalRequest(request);
  return createHash('sha256').update(canonicalRequest).digest('hex');
}

function resolveTrustProof(request: ActionRequest): TrustProof | undefined {
  const payload = request.payload as Record<string, unknown>;
  const candidate = payload.trustProof ?? payload.trust_proof;
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const proof = candidate as Partial<TrustProof>;
  if (
    typeof proof.eventHash !== 'string' ||
    typeof proof.actorSignature !== 'string' ||
    typeof proof.canonicalRequest !== 'string' ||
    !Array.isArray(proof.capabilityScope) ||
    !proof.capabilityScope.every((item) => typeof item === 'string')
  ) {
    return undefined;
  }

  return {
    eventHash: proof.eventHash,
    actorSignature: proof.actorSignature,
    capabilityScope: proof.capabilityScope,
    canonicalRequest: proof.canonicalRequest,
  };
}

function verifyActorSignature(publicKeyBase64: string, message: string, signatureBase64: string): boolean {
  try {
    const publicKeyDer = Buffer.from(publicKeyBase64, 'base64');
    const signatureBytes = Buffer.from(signatureBase64, 'base64');
    const publicKeyObject = createPublicKey({
      key: publicKeyDer,
      format: 'der',
      type: 'spki',
    });

    return verifySignature(null, Buffer.from(message, 'utf8'), publicKeyObject, signatureBytes);
  } catch {
    return false;
  }
}

export function verifyTrustProof(request: ActionRequest): TrustProofVerificationResult {
  const eventHash = createRequestEventHash(request);
  const trustProof = resolveTrustProof(request);

  if (!trustProof) {
    return {
      valid: false,
      eventHash,
      reason: 'Missing or invalid trust proof',
    };
  }

  const canonicalRequest = createCanonicalRequest(request);
  if (trustProof.canonicalRequest !== canonicalRequest) {
    return {
      valid: false,
      eventHash,
      reason: 'Canonical request mismatch',
    };
  }

  if (trustProof.eventHash !== eventHash) {
    return {
      valid: false,
      eventHash,
      reason: 'Event hash mismatch',
    };
  }

  const expectedScope = normalizeCapabilityScope(request.capability.permissions ?? []);
  const providedScope = normalizeCapabilityScope(trustProof.capabilityScope);
  if (stableStringify(expectedScope) !== stableStringify(providedScope)) {
    return {
      valid: false,
      eventHash,
      reason: 'Capability scope mismatch',
    };
  }

  if (!request.device.publicKey || typeof request.device.publicKey !== 'string') {
    return {
      valid: false,
      eventHash,
      reason: 'Missing actor public key',
    };
  }

  const message = `${eventHash}:${stableStringify(providedScope)}`;
  const signatureValid = verifyActorSignature(
    request.device.publicKey,
    message,
    trustProof.actorSignature
  );

  if (!signatureValid) {
    return {
      valid: false,
      eventHash,
      reason: 'Invalid actor signature',
    };
  }

  return {
    valid: true,
    eventHash,
  };
}
