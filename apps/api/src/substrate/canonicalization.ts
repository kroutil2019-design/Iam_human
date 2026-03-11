/**
 * Canonical serialization for deterministic hashing.
 * Ensures identical logical values always serialize to identical strings,
 * regardless of key order or nested structure.
 */

export type CanonicalValue =
  | string
  | number
  | boolean
  | null
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

/**
 * Recursively normalize a value to canonical form.
 * - Undefined values are omitted
 * - Object keys are sorted alphabetically
 * - Arrays preserve order
 * - Primitives are preserved
 */
export function canonicalize(value: unknown): CanonicalValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => canonicalize(item))
      .filter((item): item is CanonicalValue => item !== undefined);
    return items;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

    const normalized: { [key: string]: CanonicalValue } = {};
    for (const [key, v] of entries) {
      const canonical = canonicalize(v);
      if (canonical !== undefined) {
        normalized[key] = canonical;
      }
    }
    return normalized;
  }

  return value as string | number | boolean;
}

/**
 * Serialize a value to a stable string representation.
 * Identical logical values will produce identical string output.
 */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item)).join(',');
    return `[${items}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const serialized = entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',');
    return `{${serialized}}`;
  }

  return JSON.stringify(value);
}

/**
 * Verify that two values serialize identically.
 */
export function hasDeterministicSerialization(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
