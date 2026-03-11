/**
 * Deterministic Substrate
 *
 * A clean, composable substrate for deterministic execution and testing.
 * Guarantees that identical logical inputs produce identical outputs,
 * enabling reproducible testing and debugging.
 *
 * Core Modules:
 * - canonicalization: Stable string serialization for deterministic hashing
 * - event-hash: Event hashing with volatility handling (timestamps, nonces)
 * - deterministic-state: Execution state management and replay capability
 * - substrate-runtime: Orchestrates the deterministic execution pipeline
 */

export {
  canonicalize,
  stableStringify,
  hasDeterministicSerialization,
  CanonicalValue,
} from './canonicalization';

export {
  blankVolatileFields,
  createEventHash,
  createNormalizedConfigurationJson,
  hasDeterministicEventHash,
  hashToExecutionId,
  VolatileFields,
} from './event-hash';

export {
  DeterministicState,
  ExecutionSnapshot,
  ExecutionStage,
  DeterministicStateMetrics,
  globalDeterministicState,
} from './deterministic-state';

export {
  SubstrateRuntime,
  DeterministicResult,
  globalSubstrateRuntime,
} from './substrate-runtime';
