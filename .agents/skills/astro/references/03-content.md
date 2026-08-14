# Content collections & CMS data

## Build-time collections

One config file, at `src/content.config.ts` (**not** the legacy `src/content/config.ts`):

```ts
import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(70),
      description: z.string().max(160),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      cover: image().optional(),
      author: reference('authors'),
      tags: z.array(z.string()).default([]),
    }),
});

const authors = defineCollection({
  loader: file('./src/data/authors.json'), // each object needs its own `id`
  schema: z.object({ id: z.string(), name: z.string(), url: z.string().url() }),
});

export const collections = { blog, authors };
```

Loader choice:

| Loader | For |
|---|---|
| `glob()` | one file per entry (Markdown, MDX, JSON, YAML, TOML) |
| `file()` | many entries inside one file — every object must carry an `id` |
| custom | a CMS, an API, a database, or generated data |

Zod comes from **`astro/zod`** and is Zod 4: `z.email()`, not `z.string().email()`.
Importing `z` from `astro:content` is deprecated.

## Querying

```ts
import { getCollection, getEntry, render } from 'astro:content';

const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

const post = await getEntry('blog', slug);
const author = await getEntry(post.data.author); // resolves a reference()
const { Content, headings } = await render(post);
```

**`getCollection()` order is not deterministic. Always sort explicitly.** Unsorted output
looks fine locally and reorders itself on another machine or another build.

Draft handling: filter in the query, and decide whether drafts are visible in dev. Do not
rely on the file living in a `drafts/` folder — that is not a filter.

## Custom loaders (CMS, API, database)

A loader owns fetching and caching, so the rest of the app queries content the same way
regardless of source. Load **once** in the loader, not per component — a `fetch()` inside
a component's frontmatter multiplies by the number of pages built.

```ts
import type { Loader } from 'astro/loaders';

export function cmsLoader(options: { token: string }): Loader {
  return {
    name: 'cms-loader',
    async load({ store, meta, logger, parseData, generateDigest }) {
      const since = meta.get('lastModified');
      const entries = await fetchFromCms(options.token, since);

      for (const entry of entries) {
        const data = await parseData({ id: entry.slug, data: entry });
        store.set({ id: entry.slug, data, digest: generateDigest(data) });
      }
      meta.set('lastModified', new Date().toISOString());
    },
  };
}
```

Use `meta` for incremental sync and `digest` so unchanged entries don't invalidate
downstream work. Without them, every build refetches everything.

Never put a CMS token in a loader that could be imported by client code. Read it from
`astro:env` with `access: 'secret'`.

## Live collections

Request-time content, no rebuild. Requires an adapter.

```ts
// src/live.config.ts
import { defineLiveCollection } from 'astro:content';

export const collections = {
  products: defineLiveCollection({ loader: productsLoader() }),
};
```

```astro
---
import { getLiveCollection } from 'astro:content';
export const prerender = false;

const { entries, error } = await getLiveCollection('products');
if (error) return Astro.rewrite('/500');
---
```

Errors are returned, not thrown — check `error` on every call or failures render as empty
pages. Loaders can return a `cacheHint` with tags that the route cache reads
automatically (`references/09-perf-cache-security.md`).

**Live collections do not support MDX, image optimization, or persistence.** They are for
data that must be fresh, not for your article body.

## Choosing a content freshness strategy

| Situation | Approach |
|---|---|
| Content changes on deploy | Build-time collection. Simplest, fastest, cacheable. |
| Editors publish independently | Build-time collection + CMS webhook triggering a rebuild |
| Data must be current within seconds (stock, pricing) | Live collection + route cache with tags |
| One small fresh region on an otherwise static page | Server island (`references/04-islands.md`) |

## Astro DB

`@astrojs/db` was removed and is unmaintained. For a database, use `node:sqlite`, Drizzle,
or a hosted database reached through the adapter's runtime (D1 on Cloudflare, any TCP/HTTP
database on Node). Do not scaffold Astro DB into a new project.

## Traps

- Editing the schema requires a sync: `astro sync`, or press `s` + Enter in the dev server.
  Stale generated types produce errors that look unrelated to the schema.
- Entry IDs containing `/` need a rest param route (`[...id].astro`).
- Referencing a collection with `reference()` returns a pointer; you must `getEntry()` it
  before reading fields.
- `Astro.glob()` no longer exists. Use `getCollection()`, or `import.meta.glob()` for
  genuinely unstructured local files.
