# Performance, caching & security

## The budget

A marketing page or an article should ship **0 KB of framework JavaScript**. That is the
baseline, not an aspiration. Before adding an island, ask what it costs and what breaks
without it.

Measure, don't assume: build, preview, and look at the network panel or a Lighthouse run.
"It's Astro, so it's fast" is how a 300 KB bundle happens.

Core Web Vitals map to specific Astro decisions:

| Metric | Usual cause in Astro | Fix |
|---|---|---|
| LCP | hero image unoptimized or not prioritized; font blocking | `<Image priority>`, `<Font preload>` on one face |
| CLS | missing dimensions, no island fallback, font swap | explicit sizes, `fallback` slot, metric-matched fallbacks |
| INP | too much hydrated JS on the main thread | fewer/smaller islands, `client:visible`, Partytown for tags |

## Route caching

A platform-agnostic cache for on-demand pages and endpoints. Requires an adapter.

```js
import { defineConfig, memoryCache } from 'astro/config';

export default defineConfig({
  cache: { provider: memoryCache() },
  routeRules: {
    '/blog/[...slug]': { maxAge: 300, swr: 60 },
    '/products/[...slug]': { maxAge: 3600, tags: ['products'] },
    '/api/[...path]': { swr: 600 },
  },
});
```

Per-route, overriding the rules:

```astro
---
Astro.cache.set({ maxAge: 120, swr: 60, tags: ['home'] });
---
```

In endpoints and middleware, `context.cache.set()`. Invalidate by tag or path:

```ts
await context.cache.invalidate({ tags: ['products'] });
await context.cache.invalidate({ path: '/api/data' });
```

| Option | Meaning |
|---|---|
| `maxAge` | seconds the response stays fresh |
| `swr` | stale-while-revalidate window |
| `tags` | labels for grouped invalidation |
| `false` | opt this route out of caching |

Rules that matter:

- **Caching does not happen in `astro dev`** (`cache.enabled` is `false` there). Test with
  `astro build && astro preview`, or you will conclude the cache is broken.
- Route code wins over `routeRules`.
- Multiple `set()` calls accumulate tags; scalar values are last-write-wins.
- CDN-backed providers exist per adapter — `cacheCloudflare()`, `cacheVercel()`,
  `cacheNetlify()` — and are experimental. Say so when you introduce one.
- Pair tags with live collections: a loader's cache hints let content updates invalidate
  exactly the affected routes instead of triggering a rebuild.
- Never cache a personalized response. If a page varies by user, either don't cache it or
  move the personalized part into a server island.

## Static caching

`_astro/` assets are content-hashed and safe to cache immutably for a year. HTML should be
short-lived or revalidated. Set this at the host level (`_headers`, platform config) and
verify it after deploy — it is the cheapest performance win and the most commonly missed.

## Prefetch

```js
export default defineConfig({
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
});
```

Per link: `<a href="/pricing" data-astro-prefetch="hover">`. Prefetching everything on a
large site wastes bandwidth on mobile; `hover` or `viewport` on key paths is the better
default.

## View transitions

```astro
---
import { ClientRouter } from 'astro:transitions';
---
<head><ClientRouter /></head>
```

`<ViewTransitions />` was renamed — that component no longer exists.

The cost: client-side routing means scripts do not re-execute the way they do on a full
page load. Re-initialize on `astro:page-load`, and remove listeners on
`astro:before-swap`, or every navigation stacks another listener.

Use the documented event names as plain strings (`'astro:page-load'`,
`'astro:before-preparation'`, `'astro:before-swap'`); the exported event constants and
helpers were removed from `astro:transitions`.

## Content Security Policy

```js
export default defineConfig({
  security: {
    csp: true,
  },
});
```

Astro hashes its own scripts and styles for both static and on-demand pages. Defaults to
`false`.

What breaks when you turn it on: inline third-party snippets, analytics loaders, anything
injected at runtime. Enumerate those first, add explicit directives for them, then verify
in `astro preview` — not in dev.

On the Node adapter, prerendered pages need `staticHeaders: true` for the policy to be
sent as a header.

## Other security settings

| Setting | Default | Note |
|---|---|---|
| `security.checkOrigin` | `true` | blocks cross-origin form submissions |
| `security.allowedDomains` | `[]` | permitted host patterns for incoming requests |
| `security.actionBodySizeLimit` | 1 MB | raise deliberately for uploads |

Keep authorization checks server-side — in middleware, the action handler, or the
endpoint. A hidden UI element is not access control.

## Rendering internals

Queued rendering (a two-pass strategy, roughly 2.4× faster than the old recursive
renderer) is the default in current Astro; `pooling` and `contentCache` tune it. If you
find `experimental.queuedRendering` in a config, it is a leftover flag — remove it.

Experimental flags currently worth knowing: `clientPrerender`, `contentIntellisense`,
`svgOptimization`, `incrementalBuild`. Always disclose when you enable one.
