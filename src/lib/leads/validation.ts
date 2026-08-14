import { z } from 'zod';

import { site } from '@/config/site.config';
import {
  buildFormFieldSchema,
  requiredCheckboxSchema,
} from '@/lib/forms/schema';

export const MAX_LEAD_BODY_BYTES = 16 * 1024;

/**
 * Builds the request schema from `site.config.form.fields`.
 *
 * The original implementation hardcoded one client's fields (a `service` enum of
 * that agency's offers, a mandatory `company`), which meant rewriting validation
 * and the form component for every project — exactly the cost the boilerplate is
 * supposed to remove. Field definitions now drive both the schema and the markup.
 */
const optionalUtm = z.string().trim().max(200, {
  error: '200 caractères maximum.',
}).optional();

export function buildLeadSchema() {
  const shape: Record<string, z.ZodType> = {
    submissionId: z.uuid(),
    startedAt: z.number().int().positive(),
    // Honeypot: present in the DOM, hidden from humans, must stay empty.
    website: z.string().max(200).optional(),
    captchaToken: z.string().trim().max(4096, {
      error: 'Jeton CAPTCHA invalide.',
    }).optional(),
    utm: z
      .strictObject({
        source: optionalUtm,
        medium: optionalUtm,
        campaign: optionalUtm,
        term: optionalUtm,
        content: optionalUtm,
      })
      .strict()
      .optional(),
  };

  for (const field of site.form.fields) {
    shape[field.name] = buildFormFieldSchema(field);
  }

  if (site.form.requireAcknowledgement) {
    shape.acknowledgement = requiredCheckboxSchema;
  }

  if (site.form.marketingOptIn) {
    // A SEPARATE, always-optional box. Bundling marketing consent into the main
    // submission is what makes a consent invalid.
    shape.marketingOptIn = z.boolean().optional();
  }

  return z.strictObject(shape);
}

const leadSchema = buildLeadSchema();

export interface LeadPayload {
  submissionId: string;
  startedAt: number;
  website?: string;
  captchaToken?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  acknowledgement?: boolean;
  marketingOptIn?: boolean;
  [key: string]: unknown;
}

export type ParseResult =
  | { success: true; data: LeadPayload }
  | { success: false; fieldErrors: Record<string, string> };

export function parseLeadRequest(value: unknown): ParseResult {
  const result = leadSchema.safeParse(value);

  if (result.success) {
    return { success: true, data: result.data as LeadPayload };
  }

  // Zod's flat formatter is the right shape for a single-level form: each field
  // gets its first safe, user-facing message without echoing submitted values.
  const flattened = z.flattenError(result.error);
  const fieldErrors: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
    if (messages?.[0]) fieldErrors[key] = messages[0];
  }

  return { success: false, fieldErrors };
}

/** Extracts only the configured form fields, as strings, for delivery. */
export function toLeadFields(payload: LeadPayload): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const field of site.form.fields) {
    const value = (payload as Record<string, unknown>)[field.name];
    if (value === undefined || value === null || value === '') continue;
    fields[field.name] = String(value);
  }

  return fields;
}
