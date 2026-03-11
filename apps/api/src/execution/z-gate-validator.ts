import {
  PrimitiveConfiguration,
  PrimitiveName,
  ValidationResult,
} from './models';

export class ZGateValidator {
  validate(configuration: PrimitiveConfiguration): ValidationResult {
    const errors: string[] = [];

    this.ensurePrimitivePresence(configuration, errors);
    if (errors.length > 0) {
      return { valid: false, errors };
    }
    this.ensurePrimitiveStructure(configuration, errors);
    this.ensureSemanticCoherence(configuration, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private ensurePrimitivePresence(configuration: PrimitiveConfiguration, errors: string[]): void {
    const requiredPrimitives: PrimitiveName[] = [
      'device',
      'identity',
      'intent',
      'legitimacy',
      'context',
      'capability',
    ];

    for (const primitive of requiredPrimitives) {
      if (!configuration[primitive]) {
        errors.push(`Missing primitive: ${primitive}`);
      }
    }
  }

  private ensurePrimitiveStructure(configuration: PrimitiveConfiguration, errors: string[]): void {
    if (!configuration.device.deviceId?.trim()) {
      errors.push('Invalid device primitive: deviceId is required');
    }

    if (!configuration.identity.actorId?.trim()) {
      errors.push('Invalid identity primitive: actorId is required');
    }

    if (!configuration.intent.actionType?.trim()) {
      errors.push('Invalid intent primitive: actionType is required');
    }

    if (!configuration.legitimacy.authMethod?.trim()) {
      errors.push('Invalid legitimacy primitive: authMethod is required');
    }

    if (!configuration.context.route?.trim()) {
      errors.push('Invalid context primitive: route is required');
    }

    if (!Array.isArray(configuration.capability.permissions)) {
      errors.push('Invalid capability primitive: permissions must be an array');
    }
  }

  private ensureSemanticCoherence(configuration: PrimitiveConfiguration, errors: string[]): void {
    const actionType = configuration.intent.actionType;
    const anonymousAllowedActions = new Set(['PROOF_VERIFY', 'AUTH_REQUEST_OTP', 'AUTH_VERIFY_OTP']);

    if (actionType.startsWith('AUTH_') && configuration.legitimacy.authMethod === 'public') {
      errors.push('Semantic mismatch: AUTH_* actions cannot use public authMethod');
    }

    if (actionType === 'PROOF_VERIFY' && configuration.identity.actorType !== 'anonymous') {
      errors.push('Semantic mismatch: PROOF_VERIFY must use anonymous actorType');
    }

    if (!anonymousAllowedActions.has(actionType) && configuration.identity.actorType === 'anonymous') {
      errors.push('Semantic mismatch: anonymous actorType is not allowed for this action');
    }
  }
}
