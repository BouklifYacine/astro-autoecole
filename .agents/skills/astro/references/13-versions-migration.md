# Versions & migration

## Detect first

```bash
cat package.json                    # astro version + adapters + integrations
npx astro --version
```

Apply the patterns of the **installed** major. If the project is behind, finish the
requested work in its current version, then propose the upgrade as separate work with its
own verification. Silently mixing eras is how a codebase ends up with APIs from three
majors.

Reference point for this skill: **Astro 7.2.1, Vite 8, Node ≥ 22.12** (verified
2026-08-12). Re-verify rather than trusting these numbers.

Upgrade command:

```bash
npx @astrojs/upgrade
```

It moves Astro and the official integrations together, which matters — adapters ship
breaking changes on every Astro major.

## Astro 6 → 7

| Change | What to do |
|---|---|
| **Rust compiler is now the only compiler** | HTML is validated strictly: an unclosed non-void tag is an **error**, and invalid nesting is no longer auto-corrected. Fix the markup. |
| **`compressHTML` default `true` → `'jsx'`** | Whitespace between inline elements is stripped by JSX rules: `<span>hello</span><em>world</em>` renders as `helloworld`. Add explicit `{" "}`, or set `compressHTML: true` to restore the old behavior. |
| **Markdown default is Sätteri** | remark/rehype plugins no longer run. Port to mdast/hast, or install `@astrojs/markdown-remark` and set `markdown: { processor: unified() }`. See `references/11-markdown.md`. |
| **Vite 8** (Rolldown bundler) | Review custom Vite plugins against Vite 8. |
| Stabilized flags | Remove `experimental.queuedRendering`, `rustCompiler`, `advancedRouting`, `cache`, `routeRules`, `logger` — `cache`/`routeRules`/`logger` move to top-level config. |
| **`@astrojs/db` removed** | Migrate to `node:sqlite`, Drizzle, or a hosted database. |
| `astro:transitions` internals removed | `TRANSITION_*` constants, `isTransitionBeforePreparationEvent()`, `isTransitionBeforeSwapEvent()`, `createAnimationScope()` are gone. Use event names as strings. |
| `getContainerRenderer()` moved | Import from `<pkg>/container-renderer`. |
| `src/fetch.ts` reserved | Rename any existing file with that name, or set `fetchFile`. |
| CSS serialization | Named colors may emit as hex, `url()` quoting may change. Cosmetic — don't chase it. |

## Astro 5 → 6

Still relevant when a project is two majors behind.

| Change | Migration |
|---|---|
| Node 18/20 dropped | Node ≥ 22.12 |
| Zod 4 | import `z` from `astro/zod`; `z.email()` replaces `z.string().email()` |
| Shiki 4 | review highlighting config |
| **`Astro.glob()` removed** | `getCollection()`, or `import.meta.glob()` |
| **`<ViewTransitions />` removed** | `<ClientRouter />` |
| Legacy content collections removed | `src/content.config.ts` + loaders |
| `emitESMImage()` | `emitImageMetadata()` |
| `.cjs` / `.cts` config files | rename to `.mjs` / `.ts` / `.mts` |
| Session driver as a string | `sessionDrivers.x()` object form |
| `NodeApp`, `loadManifest()`, `loadApp()`, `createExports()`, `start()` | `createApp()` from `astro/app/entrypoint`, `setAdapter({ entrypointResolution: 'auto' })` |
| `astro:ssr-manifest` | `astro:config/server` |
| `context.rewrite()` in Actions | removed — delete the call |
| `%25` in route filenames | rename the file |
| `import.meta.env` | always inlined, never coerced — every value is a string |
| Script/style order | now declaration order (was reversed) — check for visual regressions |
| i18n `redirectToDefaultLocale` | defaults to `false`, and only applies with `prefixDefaultLocale: true` |
| Endpoints with a file extension | never take a trailing slash |
| Heading IDs | trailing hyphens preserved — check anchors |
| Images | cropping on by default without `fit`; no upscaling; `format` rasterizes SVG |

## Recognizing an outdated pattern

These are reliable signals that code — or advice — predates the installed version:

- `Astro.glob(` anywhere
- `src/content/config.ts` instead of `src/content.config.ts`
- `output: 'hybrid'`
- `<ViewTransitions />`
- `@astrojs/tailwind` in dependencies
- `Astro.locals.runtime` in a Cloudflare project
- `experimental:` keys that are now stable
- `import { z } from 'astro:content'`
- `@astrojs/db` in dependencies

## After any upgrade

```bash
npx astro sync
npx astro check
npx astro build
npx astro preview
```

Then verify by hand what the type checker cannot see: a redirect, a form submission, a
cached route, the LCP image, and — if configured — a locale URL. Report what you actually
ran and what it returned.
