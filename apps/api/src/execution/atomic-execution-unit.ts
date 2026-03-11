import {
  DeterministicOutput,
  DevicePrimitive,
  IdentityPrimitive,
  IntentPrimitive,
  LegitimacyPrimitive,
  ContextPrimitive,
  CapabilityPrimitive,
} from './models';
import { hashDeterministic } from './utils';

export class AtomicExecutionUnit {
  run(
    device: DevicePrimitive,
    identity: IdentityPrimitive,
    intent: IntentPrimitive,
    legitimacy: LegitimacyPrimitive,
    context: ContextPrimitive,
    capability: CapabilityPrimitive
  ): DeterministicOutput<Record<string, unknown>> {
    const deterministicInput = {
      device,
      identity,
      intent,
      legitimacy,
      context,
      capability,
    };

    const outputHash = hashDeterministic(deterministicInput);

    return {
      executionId: outputHash.slice(0, 32),
      actionType: intent.actionType,
      outputHash,
      payload: {
        deterministicInputHash: outputHash,
      },
    };
  }
}
