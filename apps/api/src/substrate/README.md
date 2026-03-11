# Deterministic Substrate

A clean, composable substrate for deterministic execution and testing of the I Am Human authentication pipeline.

## Purpose

The deterministic substrate provides a reusable foundation for:
- **Reproducible Testing**: Identical inputs guarantee identical outputs (modulo timestamps)
- **Execution Replay**: Ability to replay executions with identical results
- **State Management**: Clean separation of deterministic and stateful concerns
- **Testing Utilities**: Shared fixtures and utilities for deterministic test development

## Architecture

```
ActionRequest
    ↓
[Canonicalization] → Canonical form (stable serialization)
    ↓
[Event Hashing] → Deterministic event hash (volatility blanked)
    ↓
[Pipeline.run()] → Deterministic execution with validation → constraints → execution
    ↓
[State Recording] → ExecutionSnapshot recorded for replay capability
    ↓
DeterministicResult (success/failure with identical outputs for identical inputs)
```

## Core Modules

### 1. **canonicalization.ts**
Provides stable serialization for deterministic hashing.

**Key Functions:**
- `canonicalize(value)` - Normalize a value to canonical form (sorted keys, undefined omitted)
- `stableStringify(value)` - Serialize to stable string representation
- `hasDeterministicSerialization(a, b)` - Verify two values serialize identically

**Use Case:**
```typescript
const config1 = { b: 2, a: 1 };
const config2 = { a: 1, b: 2 };
const same = hasDeterministicSerialization(config1, config2); // true
```

### 2. **event-hash.ts**
Event hashing with volatility handling (timestamps, nonces).

**Key Functions:**
- `blankVolatileFields(config)` - Remove timestamp/random fields for determinism
- `createEventHash(config)` - Hash a configuration deterministically
- `hasDeterministicEventHash(a, b)` - Compare event hashes for determinism
- `hashToExecutionId(hash)` - Extract 32-char execution ID from 64-char hash

**Use Case:**
```typescript
// Same logical request, different timestamps → same event hash
const now = new Date();
const later = new Date(now.getTime() + 1000);

const config1 = { ...baseConfig, intent: { ...baseConfig.intent, requestedAt: now.toISOString() } };
const config2 = { ...baseConfig, intent: { ...baseConfig.intent, requestedAt: later.toISOString() } };

const same = hasDeterministicEventHash(config1, config2); // true
```

### 3. **deterministic-state.ts**
Execution state management for replay capability and testing.

**Key Classes:**
- `DeterministicState` - Records execution snapshots and maintains metrics
- `ExecutionSnapshot` - Captures complete execution state (id, hash, result, details)

**Methods:**
- `recordSnapshot(snapshot)` - Record an execution for replay tracking
- `findSnapshot(executionId)` - Retrieve a recorded snapshot
- `findSnapshotsByActor(actorId)` - Get all snapshots for an actor
- `getMetrics()` - Aggregate execution statistics
- `canReplay(executionId)` - Check if an execution can be replayed
- `reset()` - Clear all state (for test isolation)

**Use Case:**
```typescript
const state = new DeterministicState();
state.recordSnapshot({
  executionId: 'abc123...',
  eventHash: 'def456...',
  stage: 'executionCompleted',
  timestamp: '2026-03-11T00:00:00Z',
  actorId: 'user-1',
  actionType: 'AUTH_CHALLENGE',
  result: 'success',
  details: { /* output */ }
});

// Later, verify determinism
const metrics = state.getMetrics();
console.log(metrics.successCount); // 1
```

### 4. **substrate-runtime.ts**
Orchestrates the deterministic execution pipeline.

**Key Classes:**
- `SubstrateRuntime` - Facade wrapping the deterministic pipeline with state tracking

**Methods:**
- `run(request)` - Execute through deterministic pipeline, return DeterministicResult
- `getActionIndex()` - Get current action index snapshot
- `getDeterminismMetrics()` - Get execution state metrics
- `resetState()` - Reset for test isolation

**Example:**
```typescript
const runtime = new SubstrateRuntime();

const request: ActionRequest = {
  device: { deviceId: 'dev-1' },
  identity: { actorId: 'user-1' },
  intent: { actionType: 'AUTH_CHALLENGE' },
  legitimacy: { authMethod: 'jwt', trustLevel: 'medium' },
  context: { route: '/auth' },
  capability: { permissions: ['auth:challenge'] },
  payload: {}
};

const result = runtime.run(request);
console.log(`Success: ${result.success}`);
console.log(`Event Hash: ${result.eventHash}`);
console.log(`Execution ID: ${result.executionId}`);

// Run identical request again
const result2 = runtime.run(request);
console.log(`Same hash: ${result.eventHash === result2.eventHash}`); // true
```

## Usage in Tests

### Boundary Conditions Test
The [boundary-conditions.test.ts](../../../__tests__/boundary-conditions/boundary-conditions.test.ts) demonstrates full substrate usage:

```typescript
describe('deterministic reproducibility at boundaries', () => {
  test('identical requests produce identical hashes', () => {
    const request: ActionRequest = { /* ... */ };

    jest.useFakeTimers({ now: new Date('2026-03-10T00:00:00.000Z') });
    const result1 = deterministicPipeline.run(request);
    const result2 = deterministicPipeline.run(request);
    jest.useRealTimers();

    expect(result1.eventHash).toBe(result2.eventHash); // Guaranteed identical
  });
});
```

## Testing Utilities

### Deterministic Test Fixtures
- **Fake timers**: Jest `useFakeTimers` ensures reproducible timestamps
- **Action Index reset**: Call `actionIndex.reset()` between tests for isolation
- **State snapshots**: Use `DeterministicState` to verify execution history

### Common Patterns

**1. Deterministic Reproducibility Test**
```typescript
jest.useFakeTimers({ now: fixedDate });
const result1 = runtime.run(request);
const result2 = runtime.run(request);
jest.useRealTimers();

expect(result1.eventHash).toBe(result2.eventHash);
expect(result1.executionId).toBe(result2.executionId);
```

**2. State Isolation Between Tests**
```typescript
beforeEach(() => {
  actionIndex.reset();
  state.reset();
});
```

**3. Boundary Value Testing**
```typescript
test('minimal values produce valid hash', () => {
  const request = {
    deviceId: 'd',
    actorId: 'a',
    actionType: 'AUTH_CHALLENGE',
    /* ... minimal fields ... */
  };

  const result = runtime.run(request);
  expect(result.success).toBe(true);
  expect(result.executionId).toMatch(/^[a-f0-9]{32}$/);
});
```

## Metrics and Monitoring

The substrate tracks execution metrics automatically:

```typescript
const metrics = state.getMetrics();
console.log(metrics);
// {
//   totalExecutions: 42,
//   successCount: 40,
//   failureCount: 2,
//   executionsByActor: { 'user-1': 15, 'user-2': 27 },
//   executionsByAction: { 'AUTH_CHALLENGE': 30, 'PROOF_VERIFY': 12 },
//   executionsByResult: { 'success': 40, 'validation_failed': 2 }
// }
```

## Integration Points

### With DeterministicExecutionPipeline
The `SubstrateRuntime` wraps the existing `deterministicPipeline`, adding:
- Automatic execution snapshot recording
- State tracking for metrics and replay
- Unified result interface with deterministic guarantees

### With Jest Testing
- Use `jest.useFakeTimers()` for reproducible timestamps
- Call `reset()` between tests for isolation
- Verify `eventHash` stability for identical inputs

### With Production Execution
The substrate can be used as-is in production:
```typescript
const runtime = new SubstrateRuntime();
const result = runtime.run(clientRequest);

// Log event hash for debugging/auditing
console.log(`Event Hash: ${result.eventHash}`);
```

## Design Principles

1. **Purity**: Deterministic functions have no side effects on state
2. **Composability**: Modules can be used independently or together
3. **Testability**: Fake timers and state resets enable deterministic testing
4. **Observability**: All execution produces snapshots and metrics
5. **Immutability**: All results are immutable recordings of execution

## File Structure

```
apps/api/src/substrate/
├── canonicalization.ts        # Stable serialization
├── event-hash.ts               # Deterministic hashing with volatility handling
├── deterministic-state.ts      # Execution state management
├── substrate-runtime.ts        # Pipeline orchestration
└── index.ts                    # Unified exports
```

## Testing Coverage

All substrate modules are tested in:
- `boundary-conditions.test.ts` (14 tests for deterministic behavior)
- `canonicalization.test.ts` (serialization stability)
- `key-derivation.test.ts` (hash determinism)
- `event-hash.test.ts` (volatility handling)

**Coverage**: 96.94% statements, 87.75% branches, 100% functions
