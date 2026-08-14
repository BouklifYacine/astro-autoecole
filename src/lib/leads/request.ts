import { MAX_LEAD_BODY_BYTES } from './validation';
import { site } from '@/config/site.config';

export type JsonBodyResult =
  | { kind: 'ok'; value: unknown }
  | { kind: 'invalid-content-type' }
  | { kind: 'payload-too-large' }
  | { kind: 'invalid-json' };

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}

function declaresOverLimit(contentLength: string | null): boolean {
  if (!contentLength || !/^\d+$/.test(contentLength)) return false;
  return Number(contentLength) > MAX_LEAD_BODY_BYTES;
}

/**
 * Reads the body with a hard byte ceiling.
 *
 * Content-Length is checked first as a cheap rejection, then the stream is counted
 * as it arrives — a client controls the header, so it cannot be the only guard.
 */
export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  if (!isJsonContentType(request.headers.get('Content-Type'))) {
    return { kind: 'invalid-content-type' };
  }

  if (declaresOverLimit(request.headers.get('Content-Length'))) {
    return { kind: 'payload-too-large' };
  }

  if (!request.body) return { kind: 'invalid-json' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_LEAD_BODY_BYTES) {
        await reader.cancel();
        return { kind: 'payload-too-large' };
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { kind: 'ok', value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { kind: 'invalid-json' };
  }
}

/**
 * Same-origin check.
 *
 * Both the request's own origin and the configured site origin are accepted, so a
 * preview deployment on a technical subdomain still works.
 */
export function isAllowedOrigin(origin: string | null, requestUrl: string, siteUrl: string): boolean {
  if (!origin) return false;

  try {
    const incoming = new URL(origin).origin;
    return incoming === new URL(requestUrl).origin || incoming === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

/** A form filled faster than a human could is a bot. */
export function hasMinimumDelay(startedAt: number, minDelayMs = site.form.minDelayMs, now = Date.now()): boolean {
  return startedAt <= now - minDelayMs;
}

export function hasMinimumFormDelay(startedAt: number, now = Date.now()): boolean {
  return hasMinimumDelay(startedAt, site.form.minDelayMs, now);
}

function isPlausibleIp(value: string): boolean {
  return /^[0-9a-fA-F:.]+$/.test(value);
}

/**
 * Resolves the client IP.
 *
 * Only CF-Connecting-IP is trusted in production: X-Forwarded-For is client-supplied
 * unless a proxy you control overwrites it, so trusting it would let anyone forge a
 * fresh identity per request and walk straight past the rate limit.
 */
export function getClientIp(request: Request, isDevelopment: boolean): string | null {
  const edgeIp = request.headers.get('CF-Connecting-IP')?.trim();
  if (edgeIp && isPlausibleIp(edgeIp)) return edgeIp;

  if (!isDevelopment) return null;

  const forwarded = request.headers.get('X-Forwarded-For')?.split(',', 1)[0]?.trim();
  if (forwarded && isPlausibleIp(forwarded)) return forwarded;

  return 'local';
}
