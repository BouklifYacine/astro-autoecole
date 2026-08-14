import { site } from '@/config/site.config';
import type { RuntimeEnv } from './types';

export interface LeadConfig {
  siteUrl: string;
  bookingUrl: string | null;
}

function trimmed(value: string | undefined): string | null {
  const result = value?.trim();
  return result ? result : null;
}

function isHttpUrl(value: string, requireHttps = false): boolean {
  try {
    const { protocol } = new URL(value);
    return requireHttps ? protocol === 'https:' : protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Non-secret runtime settings for the lead route.
 *
 * Always returns a usable object — the origin falls back to site.config.domain so
 * the same-origin check still works on a fresh clone with no environment at all.
 * Whether the pipeline can actually deliver is a separate question, answered by
 * hasLeadConfiguration().
 */
export function getLeadConfig(runtime: RuntimeEnv): LeadConfig {
  const siteUrl = trimmed(runtime.SITE_URL);
  const bookingUrl = trimmed(runtime.CAL_BOOKING_URL) ?? trimmed(site.contact.bookingUrl);

  return {
    siteUrl: siteUrl && isHttpUrl(siteUrl) ? siteUrl : `https://${site.domain}`,
    bookingUrl: site.features.booking && bookingUrl && isHttpUrl(bookingUrl, true) ? bookingUrl : null,
  };
}

/**
 * True when the destination this project is configured for has its credentials.
 *
 * Deliberately narrow: it answers "can a lead leave the building", not "is every
 * optional provider present". A missing mail key degrades the acknowledgement; a
 * missing webhook loses the lead.
 */
export function hasLeadConfiguration(runtime: RuntimeEnv): boolean {
  if (!site.form.enabled) return false;

  if (site.providers.captcha === 'turnstile' && !trimmed(runtime.TURNSTILE_SECRET_KEY)) {
    return false;
  }

  if (site.providers.lead === 'n8n') {
    const url = trimmed(runtime.LEAD_WEBHOOK_URL);
    const secret = trimmed(runtime.LEAD_WEBHOOK_SECRET);
    // https only: the payload is signed, but the lead itself is personal data.
    return Boolean(url && secret && isHttpUrl(url, true));
  }

  return Boolean(trimmed(runtime.RESEND_API_KEY) && trimmed(runtime.MAIL_FROM));
}
