export type PrimitiveName =
  | 'device'
  | 'identity'
  | 'intent'
  | 'legitimacy'
  | 'context'
  | 'capability';

export interface DevicePrimitive {
  deviceId: string;
  publicKey?: string;
  fingerprint?: string;
}

export interface IdentityPrimitive {
  actorId: string;
  actorType: 'user' | 'system' | 'anonymous';
  sessionId?: string;
}

export interface IntentPrimitive {
  actionType: string;
  requestedAt: string;
  deterministicKey: string;
}

export interface LegitimacyPrimitive {
  authMethod: 'jwt' | 'otp' | 'public' | 'admin';
  trustLevel: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface ContextPrimitive {
  route: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface CapabilityPrimitive {
  permissions: string[];
  constraintsVersion: string;
}

export interface ActionRequestDevice {
  deviceId: string;
  publicKey?: string;
  fingerprint?: string;
}

export interface ActionRequestIdentity {
  actorId: string;
  actorType?: IdentityPrimitive['actorType'];
  sessionId?: string;
}

export interface ActionRequestIntent {
  actionType: string;
}

export interface ActionRequestLegitimacy {
  authMethod: LegitimacyPrimitive['authMethod'];
  trustLevel?: LegitimacyPrimitive['trustLevel'];
  evidence?: string[];
}

export interface ActionRequestContext {
  route?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface ActionRequestCapability {
  permissions?: string[];
  constraintsVersion?: string;
}

export interface ActionRequest {
  device: ActionRequestDevice;
  identity: ActionRequestIdentity;
  intent: ActionRequestIntent;
  legitimacy: ActionRequestLegitimacy;
  context: ActionRequestContext;
  capability: ActionRequestCapability;
  payload: Record<string, unknown>;
}

export interface PrimitiveConfiguration {
  device: DevicePrimitive;
  identity: IdentityPrimitive;
  intent: IntentPrimitive;
  legitimacy: LegitimacyPrimitive;
  context: ContextPrimitive;
  capability: CapabilityPrimitive;
  payload: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type ConstraintDecision = 'PERMITTED' | 'REJECTED' | 'HALT' | 'REROUTE';

export interface ConstraintResult {
  decision: ConstraintDecision;
  reasons: string[];
}

export interface ExecutionResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
}

export interface DeterministicOutput<T = unknown> {
  executionId: string;
  actionType: string;
  outputHash: string;
  payload: T;
}

export type TelemetryEventType =
  | 'configurationAccepted'
  | 'configurationRejected'
  | 'constraintViolation'
  | 'executionStarted'
  | 'executionCompleted'
  | 'executionFailed';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  actorId: string;
  actionType: string;
  executionId?: string;
  details?: Record<string, string | number | boolean>;
}
