# Adapters & deployment

An adapter is required for any on-demand rendering, server island, Action, session, or
route cache. A purely static site needs none.

**The adapter decides which runtime APIs are legal.** Most "works locally, breaks in
production" bugs in Astro are a Node API used on a non-Node runtime. Check the adapter
before writing runtime code.

## Portability matrix

| Capability | Cloudflare Workers | Vercel | Node (standalone) |
|---|---|---|---|
| Runtime | `workerd` in dev *and* prod | Node serverless / edge | Node ≥ 22.12 |
| Node APIs | partial — needs `nodejs_compat` + compat date ≥ 2024-09-23 | full | full |
| Env / bindings | `import { env } from 'cloudflare:workers'` | `process.env` | `process.env` |
| Local secrets | `.dev.vars`, `wrangler secret put` | `.env` + dashboard | `.env` (**not auto-loaded**) |
| Sessions | Workers KV, auto-provisioned | configure a driver | filesystem by default |
| Images | `imageService` (binding by default) | Vercel Image Optimization | `sharp` |
| CDN cache provider | `cacheCloudflare()` | `cacheVercel()` + native ISR | `memoryCache()` or a reverse proxy |
| Streaming | yes | yes | yes |
| Edge middleware | native | `edgeMiddleware` opt-in | n/a |
| Platform context | `Astro.request.cf`, `Astro.locals.cfContext` | Vercel headers | proxy headers |

If the project must support more than one target, put every platform access behind one
module (`src/lib/platform.ts`) so the branching lives in one file instead of scattered
across components.

## Cloudflare Workers

```js
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare(),
});
```

Minimal `wrangler.jsonc`:

```jsonc
{
  "name": "my-astro-app",
  "main": "@astrojs/cloudflare/entrypoints/server"
}
```

Adapter options worth knowing:

| Option | Default | Use |
|---|---|---|
| `imageService` | `'cloudflare-binding'` | also `'cloudflare'`, `'passthrough'`, `'compile'`, or `{ build, runtime }` |
| `imagesBindingName` | `'IMAGES'` | binding name when using the Images binding |
| `sessionKVBindingName` | `'SESSION'` | KV namespace backing sessions |
| `prerenderEnvironment` | `'workerd'` | set to `'node'` if prerendering needs Node APIs |

Environment and bindings:

```ts
import { env } from 'cloudflare:workers';

const db = env.DB;            // D1
const token = env.API_TOKEN;  // secret
```

Run `wrangler types` to generate typings for your bindings. `astro:env` also works here.

Platform extras: `Astro.request.cf` for geolocation, `Astro.locals.cfContext` for
`waitUntil()`, the global `caches` API, `_headers` and `_redirects` in `public/` for
static assets.

**Traps**

- `Astro.locals.runtime` was removed. Import from `cloudflare:workers` instead.
- **Cloudflare Pages is no longer supported** — deploy to Workers.
- Prerendering runs in `workerd` by default; a build-time script using `node:fs` needs
  `prerenderEnvironment: 'node'`.
- CommonJS-only dependencies frequently break under workerd. Prefer ESM packages.
- Workers KV is eventually consistent (up to ~60s globally) — do not use it for
  read-after-write correctness.
- Deploying a named environment: `CLOUDFLARE_ENV=staging astro build && wrangler deploy`.

## Vercel

```js
import vercel from '@astrojs/vercel';

export default defineConfig({
  adapter: vercel({
    isr: { expiration: 60 * 60 },
    maxDuration: 30,
  }),
});
```

| Option | Use |
|---|---|
| `isr` | cache on-demand pages: `expiration`, `bypassToken`, `exclude` |
| `maxDuration` | function timeout in seconds, capped by your plan |
| `imageService` / `devImageService` | Vercel Image Optimization in prod, Sharp in dev |
| `imagesConfig` | fine-grained image settings, auto-filled from Astro's `image` config |
| `webAnalytics`, `skewProtection` | platform features |
| `edgeMiddleware` | run middleware at the edge |

**Traps**

- ISR responses ignore query parameters — a page varying on `?q=` must not be ISR-cached.
- Edge middleware serializes `context.locals` to JSON: no class instances, no functions.
- ISR and Astro's own route cache are two layers. Decide which owns freshness.

## Node

```js
import node from '@astrojs/node';

export default defineConfig({
  adapter: node({ mode: 'standalone' }),
});
```

| Option | Default | Use |
|---|---|---|
| `mode` | — | `'standalone'` (self-starting server) or `'middleware'` (mount in Express/Fastify) |
| `bodySizeLimit` | 1 GB | max request body; `0`/`Infinity` disables |
| `staticHeaders` | `false` | emit headers for prerendered pages (needed for CSP) |
| `experimentalDisableStreaming` | `false` | turn off HTML streaming; rarely a good idea |

Runtime env: `HOST`, `PORT`, `SERVER_CERT_PATH`, `SERVER_KEY_PATH`.

**Traps**

- In `middleware` mode the adapter does **not** serve static files. Your HTTP framework
  must serve `dist/client/` or a CDN must.
- `.env` is not loaded automatically at runtime. Pass real environment variables (Docker
  `--env-file`, systemd, PM2) or load them yourself in the entry.
- Long-lived process: module-level mutable state is shared across all requests and all
  users. Keep per-request data in `locals`.

Minimal Dockerfile shape: build with dev dependencies, then run `node ./dist/server/entry.mjs`
with `HOST=0.0.0.0` and the production env injected.

## Static, no adapter

Build to `dist/` and upload. Configure the host to serve `404.html`, set long-lived
immutable caching on `_astro/`, and short caching on HTML. Any Action, session,
middleware-at-runtime, or route cache is unavailable — that's the trade.

## Adapter-related failure signatures

| Symptom | Likely cause |
|---|---|
| Works in `astro dev`, 500 in production | Node API on workerd, or missing env at runtime |
| `env` undefined at module scope on Cloudflare | Reading bindings at import time instead of inside a request |
| Session silently empty | No driver configured, or running in edge middleware |
| Images 404 in production | Image service incompatible with the adapter |
| Headers present in static, missing on SSR routes | Headers set by host config only; set them in code too |
