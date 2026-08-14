import type { KVStore } from '../types';

interface CloudflareKvNamespace {
  get(key: string, options?: { type?: 'text' }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Workers KV, reached through the `env` object of 'cloudflare:workers'.
 *
 * `Astro.locals.runtime` was removed in @astrojs/cloudflare v14 — this is the
 * supported path. The binding is resolved lazily inside each method so importing
 * this module outside a Worker (a test, a Node build) does not throw.
 *
 * Consistency note: Workers KV is eventually consistent, up to ~60s globally.
 * That is acceptable for rate limiting (a determined attacker gains a few extra
 * attempts across regions) and for idempotency (the destination must tolerate a
 * rare duplicate). It is NOT acceptable for anything requiring read-after-write.
 */
export function cloudflareKv(bindingName = 'LEAD_RATE_LIMIT'): KVStore {
  async function binding(): Promise<CloudflareKvNamespace> {
    const { env } = await import('cloudflare:workers');
    const namespace = (env as Record<string, unknown>)[bindingName];

    if (!namespace) {
      throw new Error(
        `KV binding "${bindingName}" is missing. Declare it in wrangler.jsonc and run \`bun run setup:cloudflare\`.`,
      );
    }

    return namespace as CloudflareKvNamespace;
  }

  return {
    async get(key) {
      return (await binding()).get(key, { type: 'text' });
    },
    async set(key, value, options) {
      await (await binding()).put(key, value, {
        ...(options?.ttlSeconds ? { expirationTtl: Math.max(60, options.ttlSeconds) } : {}),
      });
    },
    async delete(key) {
      await (await binding()).delete(key);
    },
  };
}
