import type { KVStore } from '../types';

const MAX_ENTRIES = 1_000;

interface Entry {
  value: string;
  expiresAt: number | null;
}

/**
 * In-process KVStore for development and tests.
 *
 * This exists so that rate limiting and idempotency have ONE code path instead of
 * carrying their own `isDevelopment` memory fallback. Making the fallback an
 * implementation of the interface removed ~170 lines of branching from those two
 * modules and made them directly testable.
 *
 * Not usable in production: state is per-isolate and dies with the process, so on
 * any serverless runtime every request may see an empty store.
 */
export function memoryKv(): KVStore {
  const entries = new Map<string, Entry>();

  function prune(now: number): void {
    for (const [key, entry] of entries) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        entries.delete(key);
      }
    }

    while (entries.size >= MAX_ENTRIES) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  return {
    async get(key) {
      const now = Date.now();
      prune(now);
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    async set(key, value, options) {
      const now = Date.now();
      prune(now);
      entries.set(key, {
        value,
        expiresAt: options?.ttlSeconds ? now + options.ttlSeconds * 1000 : null,
      });
    },
    async delete(key) {
      entries.delete(key);
    },
  };
}
