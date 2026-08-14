---
name: astro
description: Use when designing, implementing, reviewing, debugging, or deploying anything in an Astro project — .astro/.mdx files, astro.config.*, routing, rendering mode, islands and hydration, content collections, adapters (Cloudflare/Vercel/Node), integrations, Tailwind, images, fonts, SEO, i18n, middleware, actions, sessions, route caching, Markdown processing, or upgrading Astro versions. Also use when a build passes but production breaks, when deciding static vs on-demand rendering, or when adding any dependency to an Astro codebase.
---

# Astro

Astro's value is **shipping no JavaScript by default**. Every decision in this skill
protects that: static unless proven otherwise, hydrate only what interacts, and never
add a dependency, adapter, or rendering mode that isn't earned.

## Step 0 — Read before you write (non-negotiable)

Astro's API surface changes across majors, and this skill's details will age. **Never
recommend an API before confirming the installed version.**

```bash
cat package.json && cat astro.config.* 2>/dev/null
```

Establish, in order:

1. **Astro major version** (`package.json` + lockfile). If it differs from the version
   this skill documents, apply the patterns of the *installed* version and offer the
   upgrade as separate work. See `references/13-versions-migration.md`.
2. **Adapter** (`astro.config.*`) — decides which runtime APIs are legal. See
   `references/02-adapters.md`.
3. **Output mode** and which routes already opt out of prerendering.
4. **Existing conventions** — styling system, content structure, package manager.

This skill was written against **Astro 7.2.1 / Vite 8 / Node ≥ 22.12** (verified
2026-08-12). Treat every version number here as a claim to re-verify, not a fact.

## Non-negotiables

1. **Static by default.** On-demand rendering is justified route by route, never
   globally, for a marketing site or a blog.
2. **No `client:*` without real browser interaction**, and never `client:load` without a
   stated reason.
3. **Runtime APIs must match the declared adapter.** Node APIs do not exist on workerd.
4. **Structured content goes through the Content Layer** with a Zod schema.
5. **No new dependency, integration, adapter, or directory without a demonstrated need.**
   Reach for the smallest Astro-native solution first.

## Decision tree: how should this route render?

```
Does the route need data that only exists per request?
(cookies, session, auth, personalization, live form result, request headers)
│
├─ No ─────────────────────────────► static (default). Nothing to configure.
│
├─ Only in one small region ───────► static page + `server:defer` island
│                                     (references/04-islands.md)
│
├─ Yes, on a few routes ───────────► keep output:'static', add
│                                     `export const prerender = false` on those routes
│                                     + an adapter
│
└─ Yes, on most routes ────────────► output:'server' + adapter,
                                      `export const prerender = true` on the static ones
```

`output: 'hybrid'` no longer exists. Static and server are the only modes; per-route
`prerender` covers everything in between.

## Routing table — load at most 2 of these per task

| You are working on | Read |
|---|---|
| Rendering mode, routes, params, redirects, rewrites, endpoints, 404 | `references/01-rendering-routing.md` |
| Cloudflare / Vercel / Node, bindings, env at runtime, deploy, "works locally, breaks in prod" | `references/02-adapters.md` |
| Collections, loaders, schemas, CMS, live collections | `references/03-content.md` |
| Framework components, hydration directives, server islands, client state | `references/04-islands.md` |
| Tailwind, scoped styles, cascade, design tokens | `references/05-styling.md` |
| Images, `<Image>`, responsive layout, fonts, OG images | `references/06-assets.md` |
| Meta tags, sitemap, canonical, structured data, hreflang, i18n routing | `references/07-seo-i18n.md` |
| Middleware, actions, forms, sessions, endpoints, env vars, secrets | `references/08-server-data.md` |
| JS budget, Core Web Vitals, route caching, CSP, prefetch, view transitions | `references/09-perf-cache-security.md` |
| Writing or auditing an integration, integration hooks | `references/10-integrations-api.md` |
| Markdown, MDX, remark/rehype plugins, syntax highlighting | `references/11-markdown.md` |
| Custom request pipeline, `src/fetch.ts`, Hono | `references/12-advanced-routing.md` |
| Upgrading Astro, "this API doesn't exist anymore", version conflicts | `references/13-versions-migration.md` |

## Running the project

Astro ships commands built for agent use. Prefer them over a blocking `npm run dev`.

```bash
npx astro dev --background     # non-blocking; auto-detected in agent environments
npx astro dev status           # health; also GET /_astro/status
npx astro dev logs             # stream what the background server printed
npx astro dev stop             # shut it down
```

Verification, in increasing order of confidence:

```bash
npx astro check                # types + template diagnostics
npx astro build                # the real gate — catches adapter and content errors
npx astro preview              # required to test caching, headers, redirects
```

**Never validate caching, headers, redirects, or on-demand behavior with `astro dev`.**
Route caching is disabled in dev, and the dev server does not reproduce your adapter's
edge behavior. Build, then preview.

If these commands don't exist, the project is on an older major — check the version and
fall back to `astro dev` in the background with the tooling the project already uses.

## Review checklist

When reviewing or refactoring Astro code, report concrete file-level findings against:

- **Rendering** — is on-demand rendering justified by request-time data, route by route?
- **JavaScript** — is any JS shipped for something that isn't interactive? Is each
  `client:*` directive matched to urgency and viewport position?
- **Components** — could a framework component be a `.astro` component instead?
- **Content** — collections in `src/content.config.ts` with loaders and schemas? Results
  sorted explicitly (collection order is not deterministic)?
- **Assets** — `astro:assets` for optimizable local images, meaningful `alt`, `priority`
  on the LCP image?
- **Runtime** — do all APIs used exist on the declared adapter's runtime?
- **Boundaries** — props, fetches, env vars, form input, and API input typed and
  validated? Secrets kept server-side?
- **Delivery** — canonical URLs, metadata, redirects, trailing-slash consistency,
  reduced-motion, focus states, heading order?
- **Version** — does everything match the *installed* Astro major?
- **Restraint** — did this change add a dependency, hydration boundary, adapter, or
  speculative folder that isn't needed?

## What to report after implementing

1. Files changed and why.
2. The static / on-demand decision, per route.
3. The hydration strategy — including why a directive is *absent*.
4. Any schema, image, font, env, adapter, cache, or integration decision.
5. Results of the checks you actually ran (`astro check`, `astro build`, project tests).
   Report failures with their output; never describe an unrun command as passing.
