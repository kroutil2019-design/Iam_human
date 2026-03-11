import {
  ActionRequest,
  CapabilityPrimitive,
  ContextPrimitive,
  DevicePrimitive,
  IdentityPrimitive,
  IntentPrimitive,
  LegitimacyPrimitive,
  PrimitiveConfiguration,
} from './models';
import { hashDeterministic } from './utils';

export class ConfigurationBuilder {
  build(actionRequest: ActionRequest): PrimitiveConfiguration {
    const nowIso = new Date().toISOString();

    const device: DevicePrimitive = {
      deviceId: actionRequest.device.deviceId,
      publicKey: actionRequest.device.publicKey
        ?? this.readString(actionRequest.payload, 'publicKey')
        ?? this.readString(actionRequest.payload, 'public_key'),
      fingerprint: actionRequest.device.fingerprint
        ?? this.readString(actionRequest.payload, 'fingerprint'),
    };

    const identity: IdentityPrimitive = {
      actorId: actionRequest.identity.actorId,
      actorType: actionRequest.identity.actorType ?? 'user',
      sessionId: actionRequest.identity.sessionId,
    };

    const deterministicKey = hashDeterministic({
      actionType: actionRequest.intent.actionType,
      actorId: actionRequest.identity.actorId,
      deviceId: actionRequest.device.deviceId,
      payload: actionRequest.payload,
    });

    const intent: IntentPrimitive = {
      actionType: actionRequest.intent.actionType,
      requestedAt: nowIso,
      deterministicKey,
    };

    const legitimacy: LegitimacyPrimitive = {
      authMethod: actionRequest.legitimacy.authMethod,
      trustLevel: actionRequest.legitimacy.trustLevel ?? 'low',
      evidence: this.buildEvidence(actionRequest),
    };

    const context: ContextPrimitive = {
      route: actionRequest.context.route ?? 'unknown',
      requestId: actionRequest.context.requestId,
      userAgent: actionRequest.context.userAgent,
      ipAddress: actionRequest.context.ipAddress,
      timestamp: nowIso,
    };

    const capability: CapabilityPrimitive = {
      permissions: actionRequest.capability.permissions ?? [],
      constraintsVersion: actionRequest.capability.constraintsVersion ?? '1.0.0',
    };

    return {
      device,
      identity,
      intent,
      legitimacy,
      context,
      capability,
      payload: actionRequest.payload,
    };
  }

  private buildEvidence(actionRequest: ActionRequest): string[] {
    const evidence: string[] = actionRequest.legitimacy.evidence
      ? [...actionRequest.legitimacy.evidence]
      : ['action_request_received'];
    if (actionRequest.legitimacy.authMethod) {
      evidence.push(`auth_method:${actionRequest.legitimacy.authMethod}`);
    }
    if (actionRequest.context.route) {
      evidence.push(`route:${actionRequest.context.route}`);
    }
    return evidence;
  }

  private readString(payload: Record<string, unknown>, key: string): string | undefined {
    const value = payload[key];
    return typeof value === 'string' ? value : undefined;
  }
}
