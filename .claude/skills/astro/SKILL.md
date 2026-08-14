---
name: astro
description: Use when designing, implementing, reviewing, debugging, or deploying anything in an Astro project — .astro/.mdx files, astro.config.*, routing, rendering mode, islands and hydration, content collections, adapters (Cloudflare/Vercel/Node), integrations, Tailwind, images, fonts, SEO, i18n, middleware, actions, sessions, route caching, Markdown processing, or upgrading Astro versions. Also use when a build passes but production breaks, when deciding static vs on-demand rendering, or when adding any dependency to an Astro codebase.
---

# Astro

This skill's content lives in one place, shared with Codex and any other agent runtime in
this repo.

**Read `.agents/skills/astro/SKILL.md` now and follow it.** It contains the mandatory
version-detection step, the rendering decision tree, the non-negotiables, and a routing
table pointing to `.agents/skills/astro/references/*.md`.

Load reference files from `.agents/skills/astro/references/`, at most two per task:

| Topic | File |
|---|---|
| Rendering mode, routes, redirects, endpoints | `01-rendering-routing.md` |
| Cloudflare / Vercel / Node, bindings, deploy | `02-adapters.md` |
| Collections, loaders, schemas, CMS | `03-content.md` |
| Hydration directives, server islands | `04-islands.md` |
| Tailwind, scoped styles, tokens | `05-styling.md` |
| Images, responsive layout, fonts | `06-assets.md` |
| Meta tags, sitemap, hreflang, i18n | `07-seo-i18n.md` |
| Middleware, actions, sessions, env vars | `08-server-data.md` |
| JS budget, Core Web Vitals, caching, CSP | `09-perf-cache-security.md` |
| Integration hooks and audits | `10-integrations-api.md` |
| Markdown, MDX, plugins | `11-markdown.md` |
| Custom request pipeline, `src/fetch.ts` | `12-advanced-routing.md` |
| Upgrading Astro, removed APIs | `13-versions-migration.md` |

Do not duplicate guidance here — edit the canonical files under `.agents/skills/astro/`.
