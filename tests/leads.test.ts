import { describe, expect, it } from 'vitest';

import { site } from '../src/config/site.config';
import { memoryKv } from '../src/lib/adapters/kv/memory';
import { leadApiResponseSchema } from '../src/lib/forms/api-schema';
import { acceptSubmission, reserveSubmission } from '../src/lib/leads/idempotency';
import { consumeRateLimit } from '../src/lib/leads/rate-limit';
import { getClientIp, hasMinimumDelay, isAllowedOrigin } from '../src/lib/leads/request';
import { parseLeadRequest, toLeadFields } from '../src/lib/leads/validation';

/**
 * These tests drive the real pipeline with the real configuration. Because the
 * schema is derived from site.config.form.fields, a valid payload is built from
 * that config rather than hardcoded — otherwise the tests would silently rot the
 * moment someone edits the form.
 */
function validPayload(overrides: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    submissionId: '00000000-0000-4000-8000-000000000000',
    startedAt: Date.now() - 3_000,
    website: '',
  };

  for (const field of site.form.fields) {
    if (!field.required) continue;
    base[field.name] =
      field.type === 'email'
        ? 'alex@example.com'
        : field.type === 'checkbox'
          ? true
          : 'x'.repeat(Math.max(field.min ?? 2, 2));
  }

  return { ...base, ...overrides };
}

describe('lead validation', () => {
  it('accepts a payload built from the configured fields', () => {
    const result = parseLeadRequest(validPayload());
    expect(result.success).toBe(true);
  });

  it('rejects an unknown field rather than forwarding it', () => {
    // .strict() matters: an attacker must not be able to smuggle extra keys into
    // whatever downstream system consumes the lead.
    const result = parseLeadRequest(validPayload({ isAdmin: true }));
    expect(result.success).toBe(false);
  });

  it('reports the offending field, not a generic failure', () => {
    const result = parseLeadRequest(validPayload({ email: 'not-an-email' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(result.fieldErrors)).toContain('email');
  });

  it('keeps only configured fields when building the delivery payload', () => {
    const result = parseLeadRequest(validPayload());
    if (!result.success) throw new Error('fixture should parse');

    const fields = toLeadFields(result.data);
    expect(Object.keys(fields).sort()).toEqual(
      site.form.fields
        .filter((field) => field.required)
        .map((field) => field.name)
        .sort(),
    );
    expect(fields).not.toHaveProperty('submissionId');
    expect(fields).not.toHaveProperty('website');
  });
});

describe('lead API response validation', () => {
  it('accepts the success response contract', () => {
    const result = leadApiResponseSchema.safeParse({
      ok: true,
      redirectTo: '/merci/',
    });

    expect(result.success).toBe(true);
  });

  it('rejects malformed response data instead of trusting a type assertion', () => {
    const result = leadApiResponseSchema.safeParse({
      ok: false,
      code: 'INVALID_REQUEST',
      message: 42,
    });

    expect(result.success).toBe(false);
  });
});

describe('lead request boundary', () => {
  it('limits accepted origins to the request or the configured site', () => {
    expect(isAllowedOrigin('https://example.com', 'https://example.com/contact/', 'https://example.com')).toBe(true);
    expect(isAllowedOrigin('https://attacker.example', 'https://example.com/contact/', 'https://example.com')).toBe(false);
    expect(isAllowedOrigin(null, 'https://example.com/contact/', 'https://example.com')).toBe(false);
  });

  it('rejects a submission faster than a human', () => {
    expect(hasMinimumDelay(Date.now() - 3_000, 2_000)).toBe(true);
    expect(hasMinimumDelay(Date.now(), 2_000)).toBe(false);
  });

  it('never trusts a client-supplied forwarding header in production', () => {
    // X-Forwarded-For is attacker-controlled unless a proxy overwrites it. Trusting
    // it would hand out a fresh identity per request and defeat the rate limit.
    const forged = new Request('https://example.com/api/leads', {
      headers: { 'X-Forwarded-For': '1.2.3.4' },
    });
    expect(getClientIp(forged, false)).toBeNull();

    const edge = new Request('https://example.com/api/leads', {
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    expect(getClientIp(edge, false)).toBe('1.2.3.4');
  });
});

describe('lead state', () => {
  it('limits attempts within the window and reports a retry delay', async () => {
    const store = memoryKv();
    const { maxAttempts } = site.form.rateLimit;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      expect((await consumeRateLimit({ ip: '203.0.113.9', store })).kind).toBe('allowed');
    }

    const blocked = await consumeRateLimit({ ip: '203.0.113.9', store });
    expect(blocked.kind).toBe('limited');
    if (blocked.kind === 'limited') expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('keeps rate limits separate per client', async () => {
    const store = memoryKv();
    await consumeRateLimit({ ip: '203.0.113.1', store });
    expect((await consumeRateLimit({ ip: '203.0.113.2', store })).kind).toBe('allowed');
  });

  it('fails closed when the store is unreachable', async () => {
    const broken = {
      get: async () => {
        throw new Error('store down');
      },
      set: async () => {},
      delete: async () => {},
    };
    expect((await consumeRateLimit({ ip: '203.0.113.3', store: broken })).kind).toBe('unavailable');
  });

  it('refuses to process the same submission twice', async () => {
    const store = memoryKv();
    const id = '11111111-1111-4111-8111-111111111111';

    expect(await reserveSubmission(id, store)).toBe('new');
    expect(await reserveSubmission(id, store)).toBe('processing');

    await acceptSubmission(id, store);
    expect(await reserveSubmission(id, store)).toBe('accepted');
  });
});
