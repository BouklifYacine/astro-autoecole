import { z } from "astro/zod";

export const blogSchema = z.object({
  title: z.string().min(15).max(60),
  description: z.string().min(70).max(160),
  heading: z.string().min(10).max(90).optional(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  image: z.string().optional(),
  noindex: z.boolean().default(false),
  draft: z.boolean().default(false),
  primaryKeyword: z.string().min(2).max(80).optional(),
});

export type BlogData = z.infer<typeof blogSchema>;

/**
 * Schema for src/content/autoecole.json — the editorial source of truth for the
 * landing page.
 *
 * Validated at build time for the same reason site.config.ts is: a missing
 * section should fail the build with a readable message, not render an empty
 * <section> in production.
 */
const mediaSlotSchema = z.object({
  /** CSS aspect-ratio, e.g. "4 / 5". Reserves the space before the asset exists. */
  ratio: z.string().min(3),
  alt: z.string().min(10),
  /** Art direction for whoever shoots or sources the photo. */
  brief: z.string().min(20),
});

export const autoEcoleSchema = z.object({
  _demo: z.string(),

  aConfirmer: z.object({
    tauxReussite: z.string(),
    agrement: z.string(),
    qualiopi: z.string(),
  }),

  hero: z.object({
    eyebrow: z.string().min(3),
    title: z.string().min(20).max(120),
    lead: z.string().min(60).max(320),
    media: mediaSlotSchema,
  }),

  trust: z.array(z.object({ title: z.string(), detail: z.string() })).min(3).max(4),

  formations: z
    .array(
      z.object({
        slug: z.string().regex(/^[a-z0-9-]+$/),
        /** Must match one of FORMATION_OPTIONS — asserted in src/lib/autoecole.ts. */
        formValue: z.string(),
        name: z.string(),
        public: z.string(),
        benefit: z.string(),
        volume: z.string(),
        priceFrom: z.number().positive(),
        featured: z.boolean(),
      }),
    )
    // Six cards is already a wall. Past that the reader stops comparing.
    .min(3)
    .max(6),

  etapes: z.array(z.object({ title: z.string(), description: z.string() })).min(3).max(4),

  methode: z.object({
    intro: z.string(),
    items: z.array(z.object({ title: z.string(), description: z.string() })).min(3),
  }),

  moniteurs: z
    .array(
      z.object({
        prenom: z.string(),
        specialite: z.string(),
        secteur: z.string(),
        bio: z.string(),
        media: mediaSlotSchema,
      }),
    )
    .min(1),

  lieux: z.array(z.object({ name: z.string(), note: z.string() })).min(1),

  tarifs: z.object({
    intro: z.string(),
    formules: z
      .array(
        z.object({
          name: z.string(),
          price: z.number().positive(),
          unit: z.string(),
          pitch: z.string(),
          includes: z.array(z.string()).min(1),
          excludes: z.array(z.string()),
          featured: z.boolean(),
        }),
      )
      .min(2),
    options: z.array(z.object({ label: z.string(), price: z.number().positive() })),
    conditions: z.array(z.string()).min(1),
  }),

  avis: z.object({
    note: z.string(),
    items: z.array(
      z.object({
        prenom: z.string(),
        formation: z.string(),
        date: z.string(),
        comment: z.string(),
      }),
    ),
  }),

  faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(4),

  horaires: z
    .array(
      z.object({
        jours: z.string(),
        heures: z.string(),
        /**
         * schema.org `openingHours` has a strict format ("Mo-Fr 09:00-12:00").
         * It is written out here rather than derived from the French labels: a
         * parser guessing day codes from free text is how a business publishes
         * machine-readable hours that are quietly wrong.
         */
        schemaOrg: z.array(z.string().regex(/^[A-Za-z,-]+ \d{2}:\d{2}-\d{2}:\d{2}$/)).default([]),
      }),
    )
    .min(1),
});

export type AutoEcoleData = z.infer<typeof autoEcoleSchema>;
export type MediaSlotData = z.infer<typeof mediaSlotSchema>;
