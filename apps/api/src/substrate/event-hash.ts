/**
 * Deterministic event hashing with volatility handling.
 * Ensures identical logical events produce identical hashes despite timestamp variance.
 */

import { createHash } from 'crypto';
import { PrimitiveConfiguration } from '../execution/models';
import { stableStringify } from './canonicalization';
import { createNormalizedConfigurationJson as createNormalizedConfigurationJsonImpl } from '../execution/event-hash';

/**
 * Re-export the normalized configuration JSON function.
 */
export const createNormalizedConfigurationJson = createNormalizedConfigurationJsonImpl;

/**
 * Represents a volatile field that should be blanked for deterministic hashing.
 * Fields like timestamps are volatile and make each execution unique;
 * we blank them to achieve deterministic hashing for identical logical events.
 */
export interface VolatileFields {
  timestampFields: string[];
  randomFields: string[];
}

const DEFAULT_VOLATILE_FIELDS: VolatileFields = {
  timestampFields: ['requestedAt', 'timestamp'],
  randomFields: ['nonce', 'salt'],
};

/**
 * Blank volatile fields in a configuration to enable deterministic hashing.
 * Returns a new configuration with volatile fields set to empty strings.
 */
export function blankVolatileFields(
  config: PrimitiveConfiguration,
  volatile: VolatileFields = DEFAULT_VOLATILE_FIELDS
): PrimitiveConfiguration {
  return {
    ...config,
    intent: {
      ...config.intent,
      requestedAt: volatile.timestampFields.includes('requestedAt') ? '' : config.intent.requestedAt,
    },
    context: {
      ...config.context,
      timestamp: volatile.timestampFields.includes('timestamp') ? '' : config.context.timestamp,
    },
  };
}

/**
 * Create a deterministic hash of a configuration.
 * Volatile fields are blanked, ensuring identical logical configurations
 * produce identical hashes despite timing variance.
 */
export function createEventHash(
  config: PrimitiveConfiguration,
  volatile: VolatileFields = DEFAULT_VOLATILE_FIELDS
): string {
  const blanked = blankVolatileFields(config, volatile);
  const serialized = stableStringify(blanked);
  return createHash('sha256').update(serialized).digest('hex');
}

/**
 * Verify that two configurations would produce identical event hashes.
 * Useful for deterministic testing.
 */
export function hasDeterministicEventHash(a: PrimitiveConfiguration, b: PrimitiveConfiguration): boolean {
  return createEventHash(a) === createEventHash(b);
}

/**
 * Extract first 32 characters of a hash to use as an execution ID.
 */
export function hashToExecutionId(hash: string): string {
  return hash.substring(0, 32);
}
