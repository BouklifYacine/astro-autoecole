# SEO & internationalization

## Prerequisite

```js
export default defineConfig({ site: 'https://example.com' });
```

Without `site`, canonical URLs, the sitemap, and RSS are all wrong or missing. Set it
first.

## One SEO component, used by every layout

```astro
---
// src/components/Seo.astro
interface Props {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
}
const { title, description, image, noindex = false, type = 'website' } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site).href;
const ogImage = new URL(image ?? '/og-default.png', Astro.site).href;
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
{noindex && <meta name="robots" content="noindex, nofollow" />}

<meta property="og:type" content={type} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={ogImage} />
<meta name="twitter:card" content="summary_large_image" />
```

Every page passes its own values. The failure mode to avoid is a layout emitting defaults
*and* the page emitting its own — duplicate tags, and crawlers pick unpredictably.

Canonical URLs must be absolute and must match your `trailingSlash` setting, or you
publish a canonical that redirects.

## Sitemap

```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/draft/'),
    }),
  ],
});
```

Any page you mark `noindex` must be filtered out of the sitemap too — telling crawlers
"index this" and "don't index this" at once wastes crawl budget.

## robots.txt

```
User-agent: *
Allow: /
Sitemap: https://example.com/sitemap-index.xml
```

Keep it in `public/`. The classic incident is a staging `Disallow: /` reaching production.

## Structured data

```astro
<script type="application/ld+json" set:html={JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: post.data.title,
  datePublished: post.data.pubDate.toISOString(),
  author: { '@type': 'Person', name: author.data.name },
})} />
```

Use real schema.org types — `Organization`, `WebSite`, `Article`, `BreadcrumbList`,
`LocalBusiness`. Do not invent properties; validate before shipping.

## RSS

```ts
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'Blog',
    description: '…',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.pubDate,
      description: p.data.description,
      link: `/blog/${p.id}/`,
    })),
  });
}
```

Remember the endpoint-with-extension rule: `/rss.xml` never takes a trailing slash.

## i18n routing

```js
export default defineConfig({
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
    fallback: { en: 'fr' },
  },
});
```

| Option | Effect |
|---|---|
| `prefixDefaultLocale: false` | default locale served at `/about`, others at `/en/about` |
| `prefixDefaultLocale: true` | every locale prefixed, `/fr/about` and `/en/about` |
| `redirectToDefaultLocale` | defaults to `false`, and **only applies when `prefixDefaultLocale` is `true`** |
| `fallback` | serves another locale's page when a translation is missing |
| `fallbackType` | `'redirect'` (default) or `'rewrite'` |
| `routing: 'manual'` | disables built-in middleware; you own locale resolution |
| `domains` | per-locale domains; requires on-demand rendering |

File layout mirrors the config:

```
src/pages/index.astro        → /        (fr, the default)
src/pages/en/index.astro     → /en/
```

Never hardcode localized URLs:

```astro
---
import { getRelativeLocaleUrl } from 'astro:i18n';
const url = getRelativeLocaleUrl(Astro.currentLocale ?? 'fr', 'about');
---
```

Also available: `Astro.preferredLocale`, `Astro.preferredLocaleList` (from
`Accept-Language`, on-demand routes only).

## hreflang

Emit one `<link rel="alternate">` per locale **including the current one**, plus
`x-default`, generated from the i18n config rather than written by hand:

```astro
{locales.map((l) => (
  <link rel="alternate" hreflang={l} href={new URL(getRelativeLocaleUrl(l, path), Astro.site).href} />
))}
<link rel="alternate" hreflang="x-default" href={new URL('/', Astro.site).href} />
```

Non-reciprocal hreflang is ignored by search engines. If page A points to B, B must point
back to A.

A `fallbackType: 'rewrite'` serves untranslated content under a translated URL — make sure
hreflang and canonical still tell the truth about that page.

## Analytics

Third-party tags are the fastest way to undo Astro's performance work. Load them with
`is:inline` after consent, or move them off the main thread with `@astrojs/partytown`.
Measure the INP impact before and after.
