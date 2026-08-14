/**
 * The runtime environment as the lead pipeline sees it.
 *
 * Kept as a plain interface rather than reading astro:env directly inside each
 * module: it makes every unit test able to pass a literal object, and it is the
 * seam that lets the same pipeline run on Cloudflare, Node or Vercel.
 *
 * Provider names are generic so the starter can be moved between hosts without
 * carrying source-project identifiers into the runtime contract.
 */
export interface RuntimeEnv {
  TURNSTILE_SECRET_KEY?: string;

  LEAD_WEBHOOK_URL?: string;
  LEAD_WEBHOOK_SECRET?: string;

  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_NOTIFY_TO?: string;

  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;

  SITE_URL?: string;
  CAL_BOOKING_URL?: string;
}

export interface LeadConfig {
  siteUrl: string;
  bookingUrl: string | null;
}
