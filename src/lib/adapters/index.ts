import { site } from '@/config/site.config';
import { turnstileCaptcha } from './captcha/turnstile';
import { cloudflareKv } from './kv/cloudflare';
import { memoryKv } from './kv/memory';
import { upstashKv } from './kv/upstash';
import { mailDestination } from './lead/mail';
import { n8nDestination } from './lead/n8n';
import { resendMail } from './mail/resend';
import type { RuntimeEnv } from '../leads/types';
import type { CaptchaProvider, KVStore, LeadDestination, MailProvider } from './types';

/**
 * Single place where site.config.providers becomes real objects.
 *
 * Synchronous and dependency-injected: the caller passes the runtime environment,
 * so every unit test can drive the whole pipeline with a literal object and no
 * module mocking. Provider modules stay importable outside a Worker because the
 * Cloudflare binding is resolved lazily inside the adapter's own methods.
 *
 * I13: no provider SDK is imported anywhere outside this folder.
 */

export interface ResolvedAdapters {
  kv: KVStore | null;
  captcha: CaptchaProvider | null;
  lead: LeadDestination | null;
  mail: MailProvider | null;
}

// One memory store per isolate, so rate limiting actually accumulates in dev.
let sharedMemoryStore: KVStore | undefined;

function leadCredentials(runtime: RuntimeEnv): { url?: string; secret?: string } {
  return {
    url: runtime.LEAD_WEBHOOK_URL,
    secret: runtime.LEAD_WEBHOOK_SECRET,
  };
}

export function resolveAdapters(runtime: RuntimeEnv): ResolvedAdapters {
  const { url: leadUrl, secret: leadSecret } = leadCredentials(runtime);

  const kv =
    site.providers.kv === 'cloudflare'
      ? cloudflareKv()
      : site.providers.kv === 'upstash'
        ? runtime.UPSTASH_REDIS_REST_URL && runtime.UPSTASH_REDIS_REST_TOKEN
          ? upstashKv(runtime.UPSTASH_REDIS_REST_URL, runtime.UPSTASH_REDIS_REST_TOKEN)
          : null
        : (sharedMemoryStore ??= memoryKv());

  const captcha =
    site.providers.captcha === 'turnstile' && runtime.TURNSTILE_SECRET_KEY
      ? turnstileCaptcha(runtime.TURNSTILE_SECRET_KEY)
      : null;

  const mail =
    site.providers.mail === 'resend' && runtime.RESEND_API_KEY && runtime.MAIL_FROM
      ? resendMail(runtime.RESEND_API_KEY, runtime.MAIL_FROM)
      : null;

  const lead =
    site.providers.lead === 'n8n' && leadUrl && leadSecret
      ? n8nDestination(leadUrl, leadSecret)
      : site.providers.lead === 'mail' && mail
        ? mailDestination(mail)
        : null;

  return { kv, captcha, lead, mail };
}

/**
 * Names the environment variables that are missing for a provider.
 *
 * The original getLeadConfig() collapsed every failure into a single `null`, so a
 * forgotten variable surfaced as an opaque 503 with nothing to debug. Returning the
 * exact key names turns a support call into a log line.
 */
export function missingEnvFor(
  provider: 'kv' | 'captcha' | 'mail' | 'lead',
  runtime: RuntimeEnv,
): string[] {
  const absent = (...pairs: [string, string | undefined][]) =>
    pairs.filter(([, value]) => !value?.trim()).map(([name]) => name);

  switch (provider) {
    case 'kv':
      return site.providers.kv === 'upstash'
        ? absent(
            ['UPSTASH_REDIS_REST_URL', runtime.UPSTASH_REDIS_REST_URL],
            ['UPSTASH_REDIS_REST_TOKEN', runtime.UPSTASH_REDIS_REST_TOKEN],
          )
        : [];
    case 'captcha':
      return site.providers.captcha === 'turnstile'
        ? absent(['TURNSTILE_SECRET_KEY', runtime.TURNSTILE_SECRET_KEY])
        : [];
    case 'mail':
      return site.providers.mail === 'resend'
        ? absent(['RESEND_API_KEY', runtime.RESEND_API_KEY], ['MAIL_FROM', runtime.MAIL_FROM])
        : ['providers.mail is "none"'];
    case 'lead': {
      const { url, secret } = leadCredentials(runtime);
      return site.providers.lead === 'n8n'
        ? absent(['LEAD_WEBHOOK_URL', url], ['LEAD_WEBHOOK_SECRET', secret])
        : missingEnvFor('mail', runtime);
    }
  }
}

export { getRuntimeEnv } from './runtime';
export type {
  CaptchaProvider,
  DeliveryResult,
  KVStore,
  Lead,
  LeadDestination,
  MailMessage,
  MailProvider,
} from './types';
