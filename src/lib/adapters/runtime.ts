import {
  LEAD_WEBHOOK_SECRET,
  LEAD_WEBHOOK_URL,
  CAL_BOOKING_URL,
  MAIL_FROM,
  MAIL_NOTIFY_TO,
  RESEND_API_KEY,
  SITE_URL,
  TURNSTILE_SECRET_KEY,
  UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL,
} from 'astro:env/server';

import type { RuntimeEnv } from '../leads/types';

/**
 * Collects the runtime environment in one place.
 *
 * R1, verified against @astrojs/cloudflare 14.2.1: `Astro.locals.runtime` no longer
 * exists. Secrets come from astro:env (which the adapter feeds from the Worker's
 * env), and BINDINGS — KV, Images, D1 — come from `env` of 'cloudflare:workers',
 * read lazily inside the adapter that needs them.
 *
 * astro:env is the only path used here on purpose: it is validated at build time
 * and its client/server split makes leaking a secret into the client bundle
 * structurally impossible (I11).
 */
export function getRuntimeEnv(): RuntimeEnv {
  return {
    TURNSTILE_SECRET_KEY,
    LEAD_WEBHOOK_URL,
    LEAD_WEBHOOK_SECRET,
    RESEND_API_KEY,
    MAIL_FROM,
    MAIL_NOTIFY_TO,
    UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN,
    SITE_URL,
    CAL_BOOKING_URL,
  };
}
