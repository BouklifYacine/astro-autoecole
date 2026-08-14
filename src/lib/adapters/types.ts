/**
 * The four provider interfaces. Everything the boilerplate does with an external
 * service goes through one of these, so swapping a provider never touches a page,
 * a component, or the lead pipeline.
 *
 * I13: no provider SDK may be imported outside src/lib/adapters/.
 */

/**
 * The only real lock-in point. Three methods cover rate limiting and idempotency.
 *
 * Deliberately context-free: on Cloudflare, bindings are reachable through
 * `env` from 'cloudflare:workers' without a request object (verified against
 * @astrojs/cloudflare 14.2.1), so no request context has to be threaded through
 * the whole pipeline. Read `env` INSIDE the methods, never at module scope, so
 * these modules stay importable under Node and in tests.
 */
export interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ttlSeconds?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type MailResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' | 'rejected' | 'unavailable'; detail?: string };

export interface MailProvider {
  send(message: MailMessage): Promise<MailResult>;
}

/** A normalized lead, independent of the configured form fields. */
export interface Lead {
  submissionId: string;
  receivedAt: string;
  /** Field values keyed by `site.form.fields[].name`. */
  fields: Record<string, string>;
  marketingOptIn: boolean;
  legalBasis: string;
  utm?: Record<string, string>;
}

export type DeliveryResult =
  | { ok: true }
  | { ok: false; reason: 'unconfigured' | 'rejected' | 'timeout' | 'unavailable'; detail?: string };

export interface LeadDestination {
  deliver(lead: Lead): Promise<DeliveryResult>;
}

export type CaptchaResult = 'verified' | 'rejected' | 'unavailable' | 'disabled';

export interface CaptchaProvider {
  verify(token: string, ip: string | null): Promise<CaptchaResult>;
}
