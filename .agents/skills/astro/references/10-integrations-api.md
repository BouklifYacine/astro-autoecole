# Integrations

## Before adding one

Run this filter on every candidate — most "we need an integration" moments don't survive
it:

1. Does Astro already do this? (images, fonts, CSP, sitemap, caching, env are built in)
2. Is it maintained, and does it declare support for the installed Astro major?
3. Does it work on the project's adapter runtime?
4. Would 10 lines of local code replace it?
5. What does it ship to the client?

An unmaintained integration is the single most common reason a project cannot upgrade
Astro.

## Official integrations

| Package | For |
|---|---|
| `@astrojs/mdx` | MDX content |
| `@astrojs/sitemap` | sitemap generation |
| `@astrojs/rss` | RSS feeds (a library, not an integration) |
| `@astrojs/react` / `vue` / `svelte` / `preact` / `solid-js` | island renderers |
| `@astrojs/partytown` | third-party scripts off the main thread |
| `@astrojs/markdown-remark` | the unified/remark/rehype Markdown processor |
| `@astrojs/cloudflare` / `vercel` / `node` / `netlify` | adapters |

`@astrojs/db` was removed and is unmaintained — see `references/03-content.md`.
`@astrojs/tailwind` is the Tailwind 3 integration — see `references/05-styling.md`.

Add framework renderers only for frameworks actually used. Each one is a renderer in the
build and a potential client bundle.

## Writing an integration

```ts
import type { AstroIntegration } from 'astro';

export default function myIntegration(): AstroIntegration {
  return {
    name: 'my-integration',
    hooks: {
      'astro:config:setup': ({ config, updateConfig, injectRoute, injectScript, logger }) => {
        injectRoute({ pattern: '/_health', entrypoint: 'my-integration/health.ts' });
      },
      'astro:config:done': ({ config, injectTypes }) => {},
      'astro:build:done': ({ dir, pages, logger }) => {},
    },
  };
}
```

Hooks, in lifecycle order:

`astro:config:setup` → `astro:route:setup` → `astro:routes:resolved` →
`astro:config:done` → (dev) `astro:server:setup` → `astro:server:start` →
`astro:server:done` / (build) `astro:build:start` → `astro:build:setup` →
`astro:build:ssr` → `astro:build:generated` → `astro:build:done`

Utilities available in `astro:config:setup`: `updateConfig`, `addRenderer`, `injectRoute`,
`injectScript` (`'head-inline'`, `'before-hydration'`, `'page'`, `'page-ssr'`),
`addMiddleware` (with `pre`/`post` order), `addWatchFile`, `addClientDirective`,
`addDevToolbarApp`, `injectTypes`, `createCodegenDir`, `setAdapter`, `setPrerenderer`.

## Recently changed integration APIs

If you are reading or porting integration code, these moved:

| Old | Now |
|---|---|
| `routes` on `astro:build:done` | `astro:routes:resolved` |
| `entryPoints` on `astro:build:ssr` | removed |
| `astro:ssr-manifest` virtual module | `astro:config/server` |
| `getContainerRenderer()` from package root | `<pkg>/container-renderer` entrypoint |
| `createExports()` / `start()` adapter exports | `setAdapter({ entrypointResolution: 'auto' })` |
| `NodeApp`, `loadManifest()`, `loadApp()` | `createApp()` from `astro/app/entrypoint` |

## Auditing an existing integration

Read its `package.json` peer range against the installed Astro version, check its last
release date, grep its source for the removed APIs above, and confirm it doesn't inject
client scripts you haven't accounted for.
