import { ConstraintResult, PrimitiveConfiguration } from './models';

export class ConstraintEvaluator {
  evaluate(configuration: PrimitiveConfiguration): ConstraintResult {
    const ruleResult = this.evaluateRuleConstraints(configuration);
    if (ruleResult.decision !== 'PERMITTED') {
      return ruleResult;
    }

    const policyResult = this.evaluatePolicyConstraints(configuration);
    if (policyResult.decision !== 'PERMITTED') {
      return policyResult;
    }

    return this.evaluateStateConstraints(configuration);
  }

  private evaluateRuleConstraints(configuration: PrimitiveConfiguration): ConstraintResult {
    if (!configuration.legitimacy.evidence.length) {
      return {
        decision: 'HALT',
        reasons: ['Rule constraint: no legitimacy evidence provided'],
      };
    }

    if (
      configuration.intent.actionType === 'AUTH_VERIFY' &&
      !this.hasPayloadFields(configuration, ['publicKey', 'nonce', 'signature']) &&
      !this.hasPayloadFields(configuration, ['public_key', 'nonce', 'signature'])
    ) {
      return {
        decision: 'REJECTED',
        reasons: ['Rule constraint: AUTH_VERIFY requires publicKey/public_key, nonce, and signature'],
      };
    }

    return {
      decision: 'PERMITTED',
      reasons: [],
    };
  }

  private evaluatePolicyConstraints(configuration: PrimitiveConfiguration): ConstraintResult {
    if (configuration.intent.actionType.startsWith('AUTH_') && configuration.legitimacy.trustLevel === 'low') {
      return {
        decision: 'REJECTED',
        reasons: ['Policy constraint: AUTH actions require trust level medium or high'],
      };
    }

    if (
      configuration.intent.actionType === 'PROOF_ISSUE' &&
      !configuration.capability.permissions.includes('proof:issue')
    ) {
      return {
        decision: 'REROUTE',
        reasons: ['Policy constraint: missing proof:issue capability'],
      };
    }

    return {
      decision: 'PERMITTED',
      reasons: [],
    };
  }

  private evaluateStateConstraints(configuration: PrimitiveConfiguration): ConstraintResult {
    if (!configuration.identity.actorId.trim()) {
      return {
        decision: 'HALT',
        reasons: ['State constraint: actorId is empty'],
      };
    }

    return {
      decision: 'PERMITTED',
      reasons: [],
    };
  }

  private hasPayloadFields(configuration: PrimitiveConfiguration, fields: string[]): boolean {
    return fields.every((field) => {
      const value = configuration.payload[field];
      return typeof value === 'string' && value.length > 0;
    });
  }
}
