import type { KVStore } from '../types';

/**
 * Upstash Redis over its REST API — the portable KVStore. It is plain HTTP, so it
 * works on every host including workerd, Vercel edge and Node.
 *
 * Implemented with fetch rather than @upstash/redis on purpose: three commands do
 * not justify an SDK in the bundle, and it keeps I13 trivially true.
 *
 * The free tier is a starting point, not a production guarantee — no availability
 * commitment, and idle databases can be archived. For a site with real stakes, use
 * a paid plan or another adapter. Being able to swap is the whole point.
 */
export function upstashKv(restUrl: string, restToken: string): KVStore {
  async function command<T>(parts: (string | number)[]): Promise<T> {
    const response = await fetch(`${restUrl.replace(/\/$/, '')}/${parts.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${restToken}` },
      // Redis is the source of truth; never let a cache answer for it.
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Upstash responded ${response.status}`);
    }

    const payload = (await response.json()) as { result: T };
    return payload.result;
  }

  return {
    async get(key) {
      return command<string | null>(['get', key]);
    },
    async set(key, value, options) {
      await (options?.ttlSeconds
        ? command(['set', key, value, 'EX', options.ttlSeconds])
        : command(['set', key, value]));
    },
    async delete(key) {
      await command(['del', key]);
    },
  };
}
