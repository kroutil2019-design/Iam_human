import { createHash } from 'crypto';
import { PrimitiveConfiguration } from './models';

type NormalizedValue =
  | string
  | number
  | boolean
  | null
  | NormalizedValue[]
  | { [key: string]: NormalizedValue };

function normalizeValue(value: unknown): NormalizedValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    const normalizedItems = value
      .map((item) => normalizeValue(item))
      .filter((item): item is NormalizedValue => item !== undefined);
    return normalizedItems;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    const normalizedObject: { [key: string]: NormalizedValue } = {};
    for (const [key, entryValue] of entries) {
      const normalizedEntry = normalizeValue(entryValue);
      if (normalizedEntry !== undefined) {
        normalizedObject[key] = normalizedEntry;
      }
    }

    return normalizedObject;
  }

  return value as string | number | boolean;
}

export function createNormalizedConfigurationJson(configuration: PrimitiveConfiguration): string {
  const hashInput: PrimitiveConfiguration = {
    ...configuration,
    intent: {
      ...configuration.intent,
      requestedAt: '',
    },
    context: {
      ...configuration.context,
      timestamp: '',
    },
  };

  const normalized = normalizeValue(hashInput) as NormalizedValue;
  return JSON.stringify(normalized);
}

export function createEventHash(configuration: PrimitiveConfiguration): string {
  const normalizedJson = createNormalizedConfigurationJson(configuration);
  return createHash('sha256').update(normalizedJson).digest('hex');
}
