import { site } from '@/config/site.config';

export interface SeoInput {
  title?: string;
  description?: string;
  /** Site-absolute path, with the trailing slash: '/blog/my-post/'. */
  path: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
  publishedAt?: Date;
  updatedAt?: Date;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string;
  image: string;
  noindex: boolean;
  type: 'website' | 'article';
  publishedAt?: string;
  updatedAt?: string;
}

/**
 * The origin, resolved once.
 *
 * `import.meta.env.SITE` carries whatever `site` was set to in astro.config, so
 * this stays correct without threading Astro.site through every call site. The
 * domain from site.config is the fallback, which keeps a fresh clone coherent
 * before SITE_URL is known (risk R3).
 */
export const origin = (import.meta.env.SITE ?? `https://${site.domain}`).replace(/\/$/, '');

export function absoluteUrl(path: string): string {
  return new URL(path, `${origin}/`).href;
}

/**
 * Resolves every SEO value for a page.
 *
 * Pages pass a path, not a URL: the origin belongs to configuration, and a page
 * that builds its own absolute URLs is a page that will get one of them wrong.
 *
 * Everything returned here is rendered server-side into the initial HTML (I6) —
 * a canonical injected by JavaScript can contradict the raw HTML one, and Google
 * is free to pick either.
 */
export function buildSeo(input: SeoInput): ResolvedSeo {
  // trailingSlash: 'always' — the canonical must match the served URL exactly,
  // or every page advertises a URL that immediately redirects.
  const path = input.path.endsWith('/') ? input.path : `${input.path}/`;

  const title = input.title
    ? site.seo.titleTemplate.replace('%s', input.title)
    : site.seo.defaultTitle || site.name;

  return {
    title,
    description: input.description || site.seo.defaultDescription,
    canonical: absoluteUrl(path),
    image: absoluteUrl(input.image || site.seo.ogImage),
    noindex: input.noindex ?? site.seo.noindexPaths.includes(path),
    type: input.type ?? 'website',
    ...(input.publishedAt ? { publishedAt: input.publishedAt.toISOString() } : {}),
    ...(input.updatedAt ? { updatedAt: input.updatedAt.toISOString() } : {}),
  };
}
