import { z } from 'zod';

export const leadApiResponseSchema = z.discriminatedUnion('ok', [
  z.strictObject({
    ok: z.literal(true),
    redirectTo: z.string(),
  }),
  z.strictObject({
    ok: z.literal(false),
    code: z.string(),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
]);

export type LeadApiResponse = z.infer<typeof leadApiResponseSchema>;
