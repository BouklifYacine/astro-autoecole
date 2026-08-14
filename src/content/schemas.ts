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
