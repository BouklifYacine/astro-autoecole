import type { CaptchaProvider, CaptchaResult } from '../types';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Cloudflare Turnstile.
 *
 * Being a Cloudflare product does not tie the site to Cloudflare hosting: this is
 * a plain HTTPS API, so it works from Vercel, Netlify or a VPS just as well.
 */
export function turnstileCaptcha(secretKey: string): CaptchaProvider {
  return {
    async verify(token: string, ip: string | null): Promise<CaptchaResult> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);

      try {
        const body = new URLSearchParams({ secret: secretKey, response: token });
        if (ip) body.set('remoteip', ip);

        const response = await fetch(SITEVERIFY_URL, {
          method: 'POST',
          body,
          signal: controller.signal,
        });

        if (!response.ok) return 'unavailable';

        const payload = (await response.json()) as { success?: unknown };
        return payload.success === true ? 'verified' : 'rejected';
      } catch {
        return 'unavailable';
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
