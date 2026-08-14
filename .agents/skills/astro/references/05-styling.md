# Styling & design system

## Scoped styles are the default

```astro
<style>
  .card { border: 1px solid var(--border); }
</style>
```

Astro scopes this to the component. It cannot leak, and it cannot reach into a child
component's markup — that is the point.

To reach a child's DOM (rendered Markdown, a framework component's internals):

```astro
<style>
  .prose :global(h2) { margin-block-start: 2rem; }
</style>
```

`<style is:global>` makes the whole block global. Use it for genuine document-level rules
only — resets, `:root` tokens, `@font-face`. A codebase where every block is `is:global`
has thrown away the main benefit of Astro's styling.

## Tailwind 4

```bash
npx astro add tailwind
```

This installs the **`@tailwindcss/vite`** plugin, not the old `@astrojs/tailwind`
integration:

```js
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: { plugins: [tailwindcss()] },
});
```

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.62 0.19 256);
  --font-display: var(--font-heading), sans-serif;
}
```

Import that file once, in the base layout. If you find `@astrojs/tailwind` in a project,
it is the Tailwind 3 integration — remove it and follow Tailwind's v4 migration.

Tailwind is a project choice, not an Astro requirement. Never introduce it into a codebase
that styles itself another way.

## Design tokens

Define tokens once. With Tailwind 4, `@theme` generates both the CSS variables and the
utilities, so scoped component styles can consume the same values:

```astro
<style>
  .badge { background: var(--color-brand); }
</style>
```

Duplicating a palette between a Tailwind config and hand-written CSS variables guarantees
drift. Pick one source.

## Cascade order

Specificity first, then order of appearance. Between sources, precedence runs:

1. `<link>` tags (lowest)
2. imported stylesheets
3. scoped component styles (highest)

Scripts and styles render in **declaration order**. Older Astro versions emitted them
reversed, so a project migrating from Astro 5 can see silent visual regressions with no
code change.

## Passing server values into CSS

```astro
---
const accent = post.data.accent;
---
<style define:vars={{ accent }}>
  .hero { background: var(--accent); }
</style>
```

Values must be serializable strings/numbers.

## Conditional classes

```astro
<div class:list={['card', { 'card--featured': featured }, extraClasses]}>
```

## External CSS

- ESM import at the top of a component for local files.
- Packages that omit file extensions may need `vite.ssr.noExternal`.
- `<link>` to `/public` or a CDN when the file must not be processed.

## Delivery

`build.inlineStylesheets` defaults to `'auto'`: stylesheets under ~4 KB are inlined as
`<style>`, larger ones are linked. Force one way only with a measurement to justify it.

## Compiler-related CSS differences

Astro's compiler uses Lightning CSS for scoping. It may serialize named colors as hex and
normalize quotes inside `url()`. These are cosmetic output differences — do not "fix" them
back, and don't read them as a regression in a diff.
