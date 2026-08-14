# Images, fonts & assets

## Which image API

| Source | Use |
|---|---|
| Local file in `src/` | `import` it, render with `<Image>` — optimized, dimensions inferred |
| File in `public/` | plain `<img>` with explicit `width`/`height` — served untouched |
| Remote URL | `<Image>` only if the host is authorized, otherwise `<img>` |
| Client-side dynamic `src` | plain `<img>` |

```astro
---
import { Image } from 'astro:assets';
import hero from '../assets/hero.jpg';
---
<Image src={hero} alt="Team at work" layout="constrained" width={1200} priority />
```

`alt` is required. Use `alt=""` for purely decorative images — omitting it is an error,
not a shortcut.

## Responsive images

`layout` controls the generated `srcset`/`sizes` and the CSS:

| `layout` | Behavior |
|---|---|
| `constrained` | scales down to fit its container, never above its intrinsic size |
| `full-width` | always fills the container width |
| `fixed` | fixed dimensions, no resizing |

Set a project default with `image.layout`, override per image.

**`image.responsiveStyles` is `false` by default.** Without it (or your own CSS), Astro
emits the `srcset` but not the sizing styles, and images can render at intrinsic size.
Enable it or own the styling deliberately.

`priority` on the LCP image sets eager loading and high fetch priority — one image per
page, above the fold. Everything else stays lazy.

## Remote images

```js
export default defineConfig({
  image: {
    domains: ['images.mycms.com'],
    remotePatterns: [{ protocol: 'https', hostname: '**.mycdn.net' }],
  },
});
```

Unauthorized remote images are passed through unoptimized. If a CMS image looks heavy in
production, this is usually why.

## `<Picture>`

```astro
<Picture src={hero} formats={['avif', 'webp']} fallbackFormat="jpeg" alt="…" />
```

Two modern formats plus a fallback is the sensible ceiling; more variants cost build time
and cache entries for no measurable gain.

## Programmatic images

```ts
import { getImage } from 'astro:assets';
const og = await getImage({ src: hero, width: 1200, height: 630, format: 'png' });
```

`getImage()` throws if called on the client. Keep it in frontmatter, endpoints, or
loaders.

## Behavior to know

- Images are **cropped by default** when both dimensions are given without `fit`.
- Images are **never upscaled** — requesting a width larger than the source returns the
  source size.
- Specifying `format` on an SVG rasterizes it.

## SVG components

```astro
---
import Logo from '../assets/logo.svg';
---
<Logo width={32} height={32} fill="currentColor" />
```

Not available inside framework components — pass the rendered markup or use a plain
`<img>` there.

## Image service & the adapter

The image service must exist on the deployment runtime. `sharp` is the default and needs
Node. Cloudflare defaults to its own binding-based service; Vercel can use its Image
Optimization API. Mismatching these builds fine and 404s in production — cross-check
`references/02-adapters.md`.

## Fonts

```js
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-body',
      weights: [400, 600],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
```

```astro
---
import { Font } from 'astro:assets';
---
<head>
  <Font cssVariable="--font-body" preload />
</head>
```

Astro downloads, caches, self-hosts, generates metric-matched fallbacks to cut CLS, and
emits preload links.

- Providers include local files, Google, Fontsource, Adobe, Bunny, Fontshare.
- Variable fonts take a range: `weights: ['300 700']`.
- **Preload sparingly.** Every preload competes with your LCP image for bandwidth. Preload
  the one face used above the fold.
- `optimizedFallbacks: false` disables the generated fallback metrics — only with a
  measured reason.

## OG images

Generate at build time in an endpoint with `getImage()` or an image library, then
reference an absolute URL in `<meta property="og:image">`. On edge runtimes, verify the
font file is reachable at runtime — this is the usual failure.
