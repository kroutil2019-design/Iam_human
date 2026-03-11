# Attack Surface Kernel Security Model

This document defines the substrate security primitive that compresses the modeled attack surface from 42 categories to 3 residual categories.

## Reduction Target

- Original attack classes: 42
- Eliminated by construction: 39
- Residual irreducible classes: 3

The residual classes are the only allowed non-eliminated outcomes in the model:

1. ProofIntegritySurface
2. InputAmbiguitySurface
3. ExecutionEnvironmentIntegritySurface

## Kernel Architecture

The Attack Surface Kernel is the only admission path and enforces:

1. Stateless trust proof verification
2. Canonical request normalization
3. Deterministic admission control
4. Outcome-bound receipt generation
5. Residual-risk boundary checks

## Security Invariants

1. Identical canonical input + identical proof => identical admission decision.
2. Nothing executes without deterministic proof admission.
3. Every accepted execution yields a reproducible receipt.
4. Verification requires no persisted trust state.
5. Eliminated attack classes cannot re-enter through extension points.

## Elimination by Construction

The following architecture constraints perform elimination by construction:

- Trust admission is stateless and proof-driven.
- Canonical request identity is mandatory and signed.
- Capability scope is signed and exact-match verified.
- Ambiguous proof containers are rejected.
- Ambiguous scope encodings are rejected.
- Non-kernel admission extensions are rejected.
- Successful execution output is verified against deterministic recomputation.
- Every decision emits a deterministic receipt.
- Receipt verification is replayable from request+receipt only.

## Original 42 Categories and Mapping

| ID | Attack Class | Status |
|---|---|---|
| AS-01 | Actor signature forgery | ProofIntegritySurface |
| AS-02 | Nonce substitution | eliminated |
| AS-03 | Capability escalation by omission | eliminated |
| AS-04 | Capability order confusion | eliminated |
| AS-05 | Trust session fixation | eliminated |
| AS-06 | Replay-window drift abuse | eliminated |
| AS-07 | Multi-proof shadowing | eliminated |
| AS-08 | Unsigned capability claims | eliminated |
| AS-09 | Admission side-channel via mutable cache | eliminated |
| AS-10 | Hidden trust override flags | eliminated |
| AS-11 | Request-body alias confusion | eliminated |
| AS-12 | Privilege inheritance bleed | eliminated |
| AS-13 | Trust downgrade confusion | eliminated |
| AS-14 | Canonical form collision risk | InputAmbiguitySurface |
| AS-15 | Unicode normalization bypass | eliminated |
| AS-16 | Optional field ambiguity | eliminated |
| AS-17 | Map key-order manipulation | eliminated |
| AS-18 | Array coercion ambiguity | eliminated |
| AS-19 | Dual-encoding payload trick | eliminated |
| AS-20 | Route-dependent trust branching | eliminated |
| AS-21 | Extension hook admission bypass | eliminated |
| AS-22 | Untracked fallback verifier | eliminated |
| AS-23 | Stateful revocation race | eliminated |
| AS-24 | Admission based on system clock | eliminated |
| AS-25 | Mutable capability registry injection | eliminated |
| AS-26 | Cross-request trust contamination | eliminated |
| AS-27 | Rehydration mismatch | eliminated |
| AS-28 | Serializer implementation drift | eliminated |
| AS-29 | Partial proof acceptance | eliminated |
| AS-30 | Execution before admission completion | eliminated |
| AS-31 | Silent execution path | eliminated |
| AS-32 | Output unlinkability | eliminated |
| AS-33 | Runtime binary tampering | ExecutionEnvironmentIntegritySurface |
| AS-34 | Nondeterministic admission branch | eliminated |
| AS-35 | Unverifiable execution output | eliminated |
| AS-36 | Receipt omission | eliminated |
| AS-37 | Replay verification gap | eliminated |
| AS-38 | Extension reintroduction of eliminated classes | eliminated |
| AS-39 | Hidden mutable trust database dependency | eliminated |
| AS-40 | Capability widening via defaults | eliminated |
| AS-41 | Admission-execution hash mismatch | eliminated |
| AS-42 | Undocumented risk boundaries | eliminated |

## Why the Residual 3 Cannot Be Removed

- ProofIntegritySurface:
  - Cannot be removed because protocol trust rests on cryptographic hardness assumptions.
  - Bounded by mandatory signature verification over deterministic proof material.
  - Audited through admission receipts and rejection reasons.

- InputAmbiguitySurface:
  - Cannot be removed because external input channels are inherently adversarial.
  - Bounded by canonicalization and strict ambiguity rejection.
  - Audited through canonical request/proof equality checks and explicit error classes.

- ExecutionEnvironmentIntegritySurface:
  - Cannot be removed because runtime and host integrity are outside protocol purity.
  - Bounded by deterministic output integrity checks and receipt verification.
  - Audited through integrity-failure receipts and replay verification results.

## Operational Effect

The kernel model replaces policy-only mitigation with construction-level exclusion for 39 classes, while making 3 residual classes explicit, bounded, and test-covered.
