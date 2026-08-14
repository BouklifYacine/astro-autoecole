# Markdown & MDX

## The processor changed

Current Astro ships **Sätteri**, a Rust Markdown/MDX compiler, as the default processor.
It replaced the unified/remark/rehype pipeline, and `@astrojs/markdown-remark` is **no
longer installed by default**.

The practical consequence: **existing remark/rehype plugins do not run**. A project
migrating from Astro 6 or earlier with any Markdown plugin will lose that behavior
silently — the build succeeds, the output is just missing the transformation.

Check for plugins before anything else:

```bash
grep -rn "remarkPlugins\|rehypePlugins\|recmaPlugins" astro.config.* src/
```

## Two valid paths

**A — stay on Sätteri (faster, smaller plugin ecosystem).** Most sites need no plugins at
all, because these are built in:

GFM (tables, footnotes, strikethrough, task lists), smart punctuation, heading IDs,
container directives, math, YAML/TOML frontmatter, superscript/subscript, wikilinks.

Opt-in features are enabled through the processor's `features` option (`directive`,
`math`, `headingAttributes`). Check whether the behavior you want is already native before
reaching for a plugin.

Custom transforms are written as **mdast** (Markdown tree) or **hast** (HTML tree)
plugins — the same tree shapes as remark/rehype, but a different plugin registry.

**B — go back to unified** when the project depends on remark/rehype plugins that have no
Sätteri equivalent:

```bash
npm i @astrojs/markdown-remark
```

```js
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  markdown: {
    processor: unified(),
    remarkPlugins: [/* … */],
    rehypePlugins: [/* … */],
  },
});
```

This is a legitimate choice, not a workaround. Say which path you took and why.

## Syntax highlighting

`markdown.syntaxHighlight` defaults to `{ type: 'shiki', excludeLangs: ['math'] }`.
Configure themes and languages there. Shiki is on version 4 — a config copied from an
older project may use options that no longer exist.

## Content in components

```astro
---
import { getEntry, render } from 'astro:content';
const post = await getEntry('blog', slug);
const { Content, headings } = await render(post);
---
<article class="prose">
  <Content />
</article>
```

Styling rendered Markdown requires `:global()` — the HTML comes from the collection, not
from your template, so scoped styles don't reach it (`references/05-styling.md`).

`headings` gives you a table of contents without parsing the HTML yourself.

## MDX

`@astrojs/mdx` lets Markdown import and render components:

```mdx
---
title: Release notes
---
import Callout from '../../components/Callout.astro';

<Callout type="warning">Read the migration guide first.</Callout>
```

- Add `client:*` to a framework component inside MDX like anywhere else — same cost rules
  apply (`references/04-islands.md`).
- MDX is not supported by live collections.
- Prefer plain Markdown when authors don't need components; MDX compiles slower and gives
  content editors more ways to break the build.

## Traps

- Heading IDs preserve trailing hyphens (a heading like `` `<Picture />` `` yields
  `id="picture-"`). Anchors written against an older Astro can break.
- Frontmatter is validated by the collection schema, not by Markdown — a typo'd field
  fails at build with a Zod error, which is the intended behavior.
- Whitespace between inline elements follows JSX rules under the current compiler
  (`compressHTML: 'jsx'`), so `<em>a</em><strong>b</strong>` renders without a space.
  See `references/13-versions-migration.md`.
