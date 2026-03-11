export type ResidualAttackCategory =
  | 'ProofIntegritySurface'
  | 'InputAmbiguitySurface'
  | 'ExecutionEnvironmentIntegritySurface';

export type AttackStatus = 'eliminated' | ResidualAttackCategory;

export interface ResidualCategoryDefinition {
  name: ResidualAttackCategory;
  whyIrreducible: string;
  boundedBy: string[];
  auditedBy: string[];
  monitoredBy: string[];
}

export interface AttackClass {
  id: string;
  name: string;
  existedBefore: string;
  architecturalChange: string;
  invariant: string;
  status: AttackStatus;
}

export interface AttackSurfaceModel {
  originalCategoryCount: number;
  finalResidualCategoryCount: number;
  residualCategories: ResidualCategoryDefinition[];
  attackClasses: AttackClass[];
}

const residualCategories: ResidualCategoryDefinition[] = [
  {
    name: 'ProofIntegritySurface',
    whyIrreducible:
      'The system must trust cryptographic assumptions; if those assumptions fail, trust proofs can be forged.',
    boundedBy: [
      'Detached signature over deterministic event hash and capability scope',
      'Strict actor public key requirement',
    ],
    auditedBy: ['Admission receipts include signature-bound eventHash and scope'],
    monitoredBy: ['Admission rejection reasons for signature and proof mismatches'],
  },
  {
    name: 'InputAmbiguitySurface',
    whyIrreducible:
      'Any external input channel can provide malformed or ambiguous data; normalization narrows but cannot remove this boundary.',
    boundedBy: [
      'Canonical request serialization before admission',
      'Ambiguous trust proof forms and duplicate scopes are rejected',
    ],
    auditedBy: ['Canonical request embedded in proof and receipt'],
    monitoredBy: ['Explicit canonical mismatch and ambiguity rejection reasons'],
  },
  {
    name: 'ExecutionEnvironmentIntegritySurface',
    whyIrreducible:
      'Execution still depends on runtime integrity (binary, host, and supply chain) that no pure protocol can fully eliminate.',
    boundedBy: [
      'Post-execution deterministic output verification',
      'Outcome-bound receipts tied to deterministic output hash',
    ],
    auditedBy: ['Receipt reproducibility checks and execution invariant assertions'],
    monitoredBy: ['Execution integrity rejection reasons and replay verification failures'],
  },
];

function eliminated(id: string, name: string, existedBefore: string, architecturalChange: string, invariant: string): AttackClass {
  return {
    id,
    name,
    existedBefore,
    architecturalChange,
    invariant,
    status: 'eliminated',
  };
}

function residual(
  id: string,
  name: string,
  existedBefore: string,
  architecturalChange: string,
  invariant: string,
  status: ResidualAttackCategory
): AttackClass {
  return {
    id,
    name,
    existedBefore,
    architecturalChange,
    invariant,
    status,
  };
}

const attackClasses: AttackClass[] = [
  residual('AS-01', 'Actor signature forgery', 'Admission accepted unsigned or weakly bound requests.', 'Stateless signature verification over eventHash+scope.', 'Every admitted request must include a valid actor signature.', 'ProofIntegritySurface'),
  eliminated('AS-02', 'Nonce substitution', 'Admission trusted mutable nonce stores.', 'Nonce removed from trust state and embedded in canonical request.', 'Proof message binds to canonical request hash.'),
  eliminated('AS-03', 'Capability escalation by omission', 'Capabilities were interpreted by path-level policy.', 'Capability scope becomes signed proof material.', 'Signed capabilityScope must equal request capabilities.'),
  eliminated('AS-04', 'Capability order confusion', 'Ordered lists were compared positionally.', 'Scope normalized by sorted deterministic serialization.', 'Equivalent scopes serialize to one canonical value.'),
  eliminated('AS-05', 'Trust session fixation', 'Mutable trust sessions controlled admission.', 'Stateless proof admission replaces trust sessions.', 'No persisted trust session is consulted for admission.'),
  eliminated('AS-06', 'Replay-window drift abuse', 'Time-window checks depended on mutable clocks/state.', 'Admission logic detached from mutable replay windows.', 'Admission decision depends only on canonical request+proof.'),
  eliminated('AS-07', 'Multi-proof shadowing', 'Multiple proof shapes could coexist in payload.', 'Dual proof fields are treated as ambiguity and rejected.', 'Only one trust proof representation is admissible.'),
  eliminated('AS-08', 'Unsigned capability claims', 'Capabilities were accepted from unsigned payload fields.', 'Capabilities are now signed and compared to request scope.', 'Unsigned capability claims are non-authoritative.'),
  eliminated('AS-09', 'Admission side-channel via mutable cache', 'Cache state influenced allow/deny path.', 'Admission path is pure and stateless.', 'No hidden mutable cache is read by admission.'),
  eliminated('AS-10', 'Hidden trust override flags', 'Runtime feature flags could bypass checks.', 'Kernel centralizes admission and refuses bypass hooks.', 'All executions pass through a single admission gate.'),
  eliminated('AS-11', 'Request-body alias confusion', 'Equivalent payload spellings produced divergent admission.', 'Canonicalization strips aliases into canonical request string.', 'Admission uses canonical request identity only.'),
  eliminated('AS-12', 'Privilege inheritance bleed', 'Prior successful actions leaked implicit privileges.', 'No persisted trust state across requests.', 'Each request proves full capability scope independently.'),
  eliminated('AS-13', 'Trust downgrade confusion', 'Mixed trust levels and path policies raced.', 'Admission is proof-first and deterministic.', 'Identical canonical input+proof yields identical decision.'),
  residual('AS-14', 'Canonical form collision risk', 'Any serializer can theoretically contain collision bugs.', 'Single canonicalization algorithm and ambiguity checks.', 'Canonical representation is deterministic and auditable.', 'InputAmbiguitySurface'),
  eliminated('AS-15', 'Unicode normalization bypass', 'Input parsing accepted semantically equivalent variants.', 'Canonicalization forces deterministic byte representation.', 'Equivalent values collapse to one canonical string.'),
  eliminated('AS-16', 'Optional field ambiguity', 'Undefined/null differences led to branch divergence.', 'Undefined fields removed during canonicalization.', 'Undefined cannot change admission semantics.'),
  eliminated('AS-17', 'Map key-order manipulation', 'Object key order affected hashing in some paths.', 'Stable key sorting before hashing.', 'Key order does not affect event identity.'),
  eliminated('AS-18', 'Array coercion ambiguity', 'Mixed scalar/array coercions were accepted.', 'Kernel rejects ambiguous scope structures.', 'Capability scope must be explicit string array.'),
  eliminated('AS-19', 'Dual-encoding payload trick', 'Equivalent binary/text forms parsed differently.', 'Canonical request signed as deterministic string.', 'Admission compares canonical string exactly.'),
  eliminated('AS-20', 'Route-dependent trust branching', 'Route metadata could change trust semantics.', 'Route stays data, not trust policy selector.', 'Trust verification is route-independent.'),
  eliminated('AS-21', 'Extension hook admission bypass', 'Pluggable middleware could skip validation.', 'Kernel disallows non-kernel admission extension points.', 'Unverified execution path is rejected by construction.'),
  eliminated('AS-22', 'Untracked fallback verifier', 'Fallback code paths were not auditable.', 'Single verifier implementation exported and used by kernel.', 'No alternate verifier can admit requests.'),
  eliminated('AS-23', 'Stateful revocation race', 'Revocation state races changed decisions for same input.', 'Stateless proof model removes mutable revocation dependency.', 'Identical input cannot diverge due to revocation races.'),
  eliminated('AS-24', 'Admission based on system clock', 'Wall-clock drift changed outcomes.', 'Admission hash omits volatile timestamps.', 'Time variance cannot alter proof verification outcome.'),
  eliminated('AS-25', 'Mutable capability registry injection', 'Runtime registry changes altered authorization.', 'Capability scope is request-local and signed.', 'External registries cannot alter admitted scope.'),
  eliminated('AS-26', 'Cross-request trust contamination', 'One request mutated trust context for next request.', 'No mutable trust context exists.', 'Request admission is context-free across calls.'),
  eliminated('AS-27', 'Rehydration mismatch', 'Hydrated fields could diverge from signed data.', 'Proof contains canonical request itself.', 'Canonical request mismatch is rejected.'),
  eliminated('AS-28', 'Serializer implementation drift', 'Different serializers were used across modules.', 'Kernel mandates a single canonical serializer.', 'Same input always serializes identically.'),
  eliminated('AS-29', 'Partial proof acceptance', 'Missing proof members were tolerated in some flows.', 'Strict structural proof validation.', 'Invalid or partial proofs never reach execution.'),
  eliminated('AS-30', 'Execution before admission completion', 'Execution could begin before all checks completed.', 'Kernel admission gate precedes pipeline execution.', 'Nothing executes without proof admission.'),
  eliminated('AS-31', 'Silent execution path', 'Some executions lacked verifiable receipt.', 'Kernel always emits an outcome-bound receipt.', 'Every accepted execution has reproducible receipt.'),
  eliminated('AS-32', 'Output unlinkability', 'Output could not be cryptographically linked to admission.', 'Receipt binds outcome digest to eventHash and executionId.', 'Receipt verifies admission-to-outcome linkage.'),
  residual('AS-33', 'Runtime binary tampering', 'Compromised runtime can alter execution despite valid protocol.', 'Post-execution invariants and receipt verification detect drift.', 'Execution integrity remains a bounded environment risk.', 'ExecutionEnvironmentIntegritySurface'),
  eliminated('AS-34', 'Nondeterministic admission branch', 'Randomness or mutable globals affected admission.', 'Admission implemented as pure deterministic function.', 'No random or hidden global state in admission path.'),
  eliminated('AS-35', 'Unverifiable execution output', 'Outputs were trusted without deterministic recomputation checks.', 'Kernel recomputes deterministic output invariants.', 'Integrity mismatch is rejected as environment risk.'),
  eliminated('AS-36', 'Receipt omission', 'No mandatory audit artifact for decisions.', 'Kernel emits receipts for accepted and rejected decisions.', 'All decisions produce deterministic receipt metadata.'),
  eliminated('AS-37', 'Replay verification gap', 'Past decisions could not be deterministically rechecked.', 'Receipt verification API recomputes canonical hash and outcome digest.', 'Receipts are replay-verifiable without trust state.'),
  eliminated('AS-38', 'Extension reintroduction of eliminated classes', 'Future extensions could bypass hardened checks.', 'Kernel applies boundary checks and rejects external admission hooks.', 'Eliminated classes cannot re-enter via extension points.'),
  eliminated('AS-39', 'Hidden mutable trust database dependency', 'Trust outcomes depended on mutable DB rows.', 'Admission requires no persisted trust state.', 'Verification reads only request-provided proof and canonical data.'),
  eliminated('AS-40', 'Capability widening via defaults', 'Implicit defaults could widen capabilities.', 'Missing capability scope yields exact empty normalized scope.', 'No implicit capability widening occurs.'),
  eliminated('AS-41', 'Admission-execution hash mismatch', 'Admission hash and execution hash could diverge silently.', 'Kernel carries eventHash through admission and receipt.', 'Event identity remains stable through execution lifecycle.'),
  eliminated('AS-42', 'Undocumented risk boundaries', 'Risk boundaries were implicit and untestable.', 'Formal 42->3 attack-surface model in code and tests.', 'Residual boundaries are explicit, enumerable, and enforced.'),
];

export function createAttackSurfaceModel(): AttackSurfaceModel {
  return {
    originalCategoryCount: 42,
    finalResidualCategoryCount: 3,
    residualCategories: residualCategories.map((item) => ({ ...item })),
    attackClasses: attackClasses.map((item) => ({ ...item })),
  };
}

export function getAttackSurfaceReductionSummary(): {
  total: number;
  eliminated: number;
  residual: number;
  residualByCategory: Record<ResidualAttackCategory, number>;
} {
  const model = createAttackSurfaceModel();
  const residualByCategory: Record<ResidualAttackCategory, number> = {
    ProofIntegritySurface: 0,
    InputAmbiguitySurface: 0,
    ExecutionEnvironmentIntegritySurface: 0,
  };

  let eliminated = 0;
  for (const attackClass of model.attackClasses) {
    if (attackClass.status === 'eliminated') {
      eliminated += 1;
      continue;
    }

    residualByCategory[attackClass.status] += 1;
  }

  const residual = model.attackClasses.length - eliminated;
  return {
    total: model.attackClasses.length,
    eliminated,
    residual,
    residualByCategory,
  };
}

export function assertAttackSurfaceModelIntegrity(): void {
  const model = createAttackSurfaceModel();
  if (model.attackClasses.length !== 42) {
    throw new Error('Attack surface model must enumerate exactly 42 original categories.');
  }

  const residualNames = new Set(model.residualCategories.map((item) => item.name));
  if (residualNames.size !== 3) {
    throw new Error('Attack surface model must define exactly 3 residual categories.');
  }

  const mappedResidual = new Set<ResidualAttackCategory>();
  for (const attackClass of model.attackClasses) {
    if (attackClass.status !== 'eliminated') {
      mappedResidual.add(attackClass.status);
      if (!residualNames.has(attackClass.status)) {
        throw new Error(`Attack class ${attackClass.id} maps to unknown residual category.`);
      }
    }
  }

  if (mappedResidual.size !== 3) {
    throw new Error('All 3 residual categories must be explicitly represented by original attack classes.');
  }
}
