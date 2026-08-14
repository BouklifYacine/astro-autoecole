import { z } from 'zod';

/**
 * Validation for site.config.ts. A missing or malformed field fails the build with
 * a readable message instead of rendering an empty tag somewhere in production.
 *
 * Provider unions list only the adapters that actually exist (§1 of the plan).
 * Adding an adapter means adding its implementation AND its union member, in the
 * same commit — never a stub that throws at runtime.
 */

const formFieldSchema = z.object({
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, 'field name must be camelCase'),
  type: z.enum(['text', 'email', 'tel', 'textarea', 'select', 'checkbox']),
  label: z.string().min(1),
  required: z.boolean().default(false),
  min: z.number().int().positive().optional(),
  max: z.number().int().positive().optional(),
  options: z.array(z.string()).optional(),
  autocomplete: z.string().optional(),
  placeholder: z.string().optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

export const siteSchema = z.object({
  name: z.string().min(1),
  legalName: z.string(),
  domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'domain without protocol, e.g. example.com'),
  lang: z.string().min(2),
  locale: z.string().min(2),

  providers: z.object({
    kv: z.enum(['cloudflare', 'upstash', 'memory']),
    mail: z.enum(['resend', 'none']),
    lead: z.enum(['n8n', 'mail']),
    captcha: z.enum(['turnstile', 'none']),
    cms: z.enum(['files']),
  }),

  seo: z.object({
    titleTemplate: z.string().includes('%s'),
    defaultTitle: z.string(),
    defaultDescription: z.string(),
    ogImage: z.string().startsWith('/'),
    verification: z.object({ google: z.string(), bing: z.string() }),
    noindexPaths: z.array(z.string().startsWith('/')),
    indexNowKey: z.string(),
  }),

  crawlers: z.object({
    allowed: z.array(z.string()),
    blocked: z.array(z.string()),
    contentSignal: z.string(),
  }),

  brand: z.object({
    themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    favicon: z.string().startsWith('/'),
    logo: z.string().startsWith('/'),
  }),

  contact: z.object({
    email: z.string(),
    phone: z.string(),
    address: z.object({
      street: z.string(),
      postalCode: z.string(),
      city: z.string(),
      country: z.string().length(2),
    }),
    bookingUrl: z.string(),
  }),

  sameAs: z.array(z.url()),

  form: z.object({
    enabled: z.boolean().default(true),
    fields: z.array(formFieldSchema).min(1),
    // RGPD: consent is one lawful basis among six. A quote request is normally a
    // pre-contractual measure taken at the person's request. What is mandatory is
    // the INFORMATION, not a checkbox. Declaring consent when it is not the real
    // basis creates its own compliance problem (right to withdraw = erasure duty).
    legalBasis: z.enum(['precontractual', 'consent', 'legitimate_interest']),
    requireAcknowledgement: z.boolean(),
    privacyNotice: z.string(),
    marketingOptIn: z.boolean(),
    autoReply: z.boolean(),
    minDelayMs: z.number().int().nonnegative(),
    rateLimit: z.object({
      maxAttempts: z.number().int().positive(),
      windowMs: z.number().int().positive(),
    }),
  }),

  legal: z.object({
    email: z.string(),
    address: z.string(),
    status: z.string(),
    siren: z.string(),
    vat: z.string(),
    capital: z.string(),
    publisher: z.string(),
    host: z.object({ name: z.string(), address: z.string(), url: z.string() }),
  }),

  nav: z.object({
    main: z.array(z.object({ label: z.string(), href: z.string() })),
    footer: z.array(z.object({ label: z.string(), href: z.string() })),
    cta: z.object({ label: z.string(), href: z.string() }),
  }),

  blog: z.object({ postsPerPage: z.number().int().positive() }),

  // Runtime behaviour only. Removing a module is init.mjs's job (rule 3):
  // a boolean never takes a route out of the build.
  features: z.object({
    analytics: z.boolean(),
    darkMode: z.boolean(),
    booking: z.boolean(),
  }),
});

export type SiteConfig = z.infer<typeof siteSchema>;

export function defineSite(config: unknown): SiteConfig {
  const result = siteSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid site.config.ts:\n${issues}`);
  }

  return result.data;
}
