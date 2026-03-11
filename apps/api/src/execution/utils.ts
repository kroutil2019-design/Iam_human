import { createHash } from 'crypto';

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
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

export function hashDeterministic(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
