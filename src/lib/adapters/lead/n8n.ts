import type { DeliveryResult, Lead, LeadDestination } from '../types';

const DELIVERY_TIMEOUT_MS = 8_000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256 over `${timestamp}.${payload}`.
 *
 * The timestamp is inside the signed material so a captured request cannot be
 * replayed later with a fresh timestamp header. The receiving end must verify the
 * signature AND reject timestamps outside a small window.
 */
export async function signPayload(payload: string, timestamp: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
}

/**
 * Posts the lead to an n8n webhook, signed.
 *
 * Header names are neutral (X-Lead-*): a brand name in a protocol header is a
 * client value leaking out of site.config, which invariant I1 forbids.
 */
export function n8nDestination(webhookUrl: string, secret: string): LeadDestination {
  return {
    async deliver(lead: Lead): Promise<DeliveryResult> {
      const payload = JSON.stringify(lead);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Lead-Signature': await signPayload(payload, timestamp, secret),
            'X-Lead-Timestamp': timestamp,
            'X-Lead-Submission-Id': lead.submissionId,
          },
          body: payload,
          // A redirect would silently send a signed payload somewhere else.
          redirect: 'error',
          signal: controller.signal,
        });

        return response.ok ? { ok: true } : { ok: false, reason: 'rejected', detail: `HTTP ${response.status}` };
      } catch (error) {
        return controller.signal.aborted
          ? { ok: false, reason: 'timeout' }
          : { ok: false, reason: 'unavailable', detail: (error as Error).message };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
