import type { KVStore } from '@/lib/adapters/types';
import { site } from '@/config/site.config';

export type RateLimitResult =
  | { kind: 'allowed' }
  | { kind: 'limited'; retryAfterSeconds: number }
  | { kind: 'unavailable' };

/**
 * Sliding-window rate limit keyed on a hash of the client IP.
 *
 * The IP is hashed before it becomes a key: the store then holds no directly
 * identifying data, which keeps the retention story simple.
 *
 * KNOWN LIMITATION — read-modify-write on a KV store is not atomic. Two concurrent
 * requests can both read N attempts and both write N+1, so a determined attacker
 * firing in parallel gets more than `maxAttempts`. On eventually-consistent stores
 * (Workers KV) that window is wider. This is accepted: the goal is to stop casual
 * form spam, not a distributed attack, and the captcha is the real gate. If you
 * need a hard limit, use a store with atomic increments (Redis INCR via Upstash)
 * and change this function — not the interface.
 */
async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseTimestamps(raw: string | null, cutoff: number): number[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > cutoff,
    );
  } catch {
    return [];
  }
}

export async function consumeRateLimit({
  ip,
  store,
  now = Date.now(),
}: {
  ip: string;
  store: KVStore;
  now?: number;
}): Promise<RateLimitResult> {
  const { maxAttempts, windowMs } = site.form.rateLimit;
  const key = `lead-rate:v1:${await hashIp(ip)}`;
  const cutoff = now - windowMs;

  try {
    const timestamps = parseTimestamps(await store.get(key), cutoff);

    if (timestamps.length >= maxAttempts) {
      const oldest = timestamps[0] ?? now;
      return {
        kind: 'limited',
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      };
    }

    await store.set(key, JSON.stringify([...timestamps, now]), {
      ttlSeconds: Math.ceil(windowMs / 1000),
    });

    return { kind: 'allowed' };
  } catch {
    // Fail closed: an unreachable store must not become an open door.
    return { kind: 'unavailable' };
  }
}
