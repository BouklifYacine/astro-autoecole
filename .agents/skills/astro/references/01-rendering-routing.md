# Rendering & routing

## Output modes

Only two exist. `output: 'hybrid'` was removed — if you see it in a config, the project
predates Astro 5.

| Mode | Meaning |
|---|---|
| `output: 'static'` (default) | Everything prerendered at build. Individual routes opt out with `export const prerender = false` (requires an adapter). |
| `output: 'server'` | Everything rendered per request. Individual routes opt in with `export const prerender = true`. Requires an adapter. |

For a marketing site or a blog, `'static'` is almost always correct. Flipping the whole
project to `'server'` to serve one dynamic page throws away CDN caching everywhere.

`prerender` is a **page-level** export. It applies to the whole route file — you cannot
prerender half a page. When only a fragment needs request-time data, use a server island
instead (`references/04-islands.md`).

Reconsider the global mode when: many routes carry `prerender = false`, the static build
is unreasonably slow, or a single small component is forcing an entire page on demand.

## What requires on-demand rendering

Cookies, sessions, auth, personalization, request headers, dynamic status codes,
`Astro.request` body, Actions invoked from a form, live content collections, and route
caching. Using any of these on a prerendered page fails — sometimes silently.

`Astro.response` is page-level only; setting it inside a child component does nothing.

## File-based routes

```
src/pages/index.astro          → /
src/pages/about.astro          → /about
src/pages/blog/[slug].astro    → /blog/:slug
src/pages/docs/[...path].astro → /docs/* (any depth)
src/pages/api/subscribe.ts     → /api/subscribe
```

Prefix a file or folder with `_` to keep it out of routing: `_components/`,
`_draft.astro`. Never leave a non-page component in `src/pages/` without the underscore.

## Route priority

When several routes could match a URL, Astro resolves in this order:

1. Reserved routes — `_astro/`, `_server_islands/`, `_actions/`
2. More path segments (more specific wins)
3. Static paths over dynamic ones
4. Named params `[page]` over rest params `[...slug]`
5. Prerendered dynamic routes over on-demand dynamic routes
6. Endpoints over pages
7. File-based routes over configured redirects
8. Alphabetical order

The practical consequence: a top-level `src/pages/[...slug].astro` is a catch-all that
swallows anything more specific routes don't claim. Add it deliberately, last.

## `getStaticPaths()`

Required for dynamic routes that are prerendered. Not used on on-demand routes.

```astro
---
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
---
```

Rules and traps:

- Runs at build time. **No request-time data**: no cookies, no `Astro.request`.
- Pass heavy objects through `props`, not `params` — params must be strings.
- Only one rest parameter per route file.
- A rest param can produce the bare parent path by returning `undefined`:
  `{ params: { path: undefined } }` → `/docs/`.
- Content collection IDs containing `/` need a rest param (`[...id].astro`), not `[id]`.

Pagination:

```astro
export async function getStaticPaths({ paginate }) {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
  return paginate(posts, { pageSize: 10 });
}
```

`getCollection()` does not guarantee order — sort before paginating or the page
boundaries shift between builds.

## Redirects

Configured (build-time / adapter-level):

```js
export default defineConfig({
  redirects: {
    '/old-page': '/new-page',
    '/old-blog/[...slug]': '/articles/[...slug]',
    '/legacy': { status: 302, destination: '/new' }, // status needs on-demand rendering
  },
});
```

A configured redirect never overrides an existing file route (rule 7 above). If the
redirect appears to do nothing, a real page is shadowing it.

Runtime:

```astro
---
if (!user) return Astro.redirect('/login');
---
```

Must be returned from the page itself — a redirect returned inside a child component has
no effect, because the response has already begun.

## Rewrites

Serve different content without changing the URL:

```astro
---
if (!post) return Astro.rewrite('/404');
---
```

A rewrite triggers a full re-render and **re-runs middleware**. Guard against rewriting
to a route that rewrites back.

## Endpoints

```ts
// src/pages/api/subscribe.ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

- Export one function per HTTP method. A missing method returns 404.
- Endpoints with a file extension (`/feed.xml`) never take a trailing slash, whatever
  `build.trailingSlash` says.
- A prerendered endpoint runs at build time and cannot read the request body.

## Error pages

`src/pages/404.astro` and `src/pages/500.astro`. On a static build the host must be told
to serve `404.html` — behavior differs per platform (`references/02-adapters.md`). A 500
page only renders for on-demand routes.

## Trailing slash

`build.format` (`'directory'` | `'file'` | `'preserve'`) and `trailingSlash` must agree
with your internal links, canonical URLs, and any host-level redirect rules. A mismatch
produces a 301 on every internal navigation, which is an SEO and latency cost that is
easy to miss because the pages still work.
