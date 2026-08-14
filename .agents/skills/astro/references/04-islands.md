# Islands & hydration

## Choose the cheapest thing that works

```
Static markup?                        → .astro component (0 KB JS)
Small DOM behavior (toggle, dialog)?  → <script> in the .astro file
Real interactive UI with state?       → framework component + client:*
Needs request-time data, not input?   → server:defer (no client JS at all)
```

A framework component **without** a `client:*` directive is server-rendered to HTML and
ships no JavaScript. That is a feature, not an oversight — do not "fix" it by adding a
directive.

## Directives

| Directive | Hydrates | Use for |
|---|---|---|
| `client:load` | immediately | above-the-fold controls needed on first paint |
| `client:idle` | when the browser goes idle | non-urgent widgets |
| `client:visible` | when scrolled into view | anything below the fold — the best default |
| `client:media={query}` | when the query matches | mobile-only menus, desktop-only panels |
| `client:only="react"` | client only, never SSR'd | components that genuinely cannot server-render |

`client:visible={{ rootMargin: '200px' }}` starts hydration slightly before entry, which
removes the perceived delay without paying the cost upfront.

`client:only` skips server rendering entirely: no HTML in the source, nothing for crawlers,
and a layout hole until JS lands. Use it only when SSR is impossible (a library touching
`window` at module scope), and say why in a comment. Reaching for it to silence an SSR
error hides a real bug.

## Cost discipline

Each hydrated island ships its framework runtime plus the component tree. Two React
islands on a page still ship React once, but every added island widens the bundle.

- Split a large interactive component into a static `.astro` shell plus the smallest
  island that actually holds state.
- Never hydrate a nav, footer, card grid, or whole page to make one button work.
- Props passed to an island are serialized into the HTML. Passing a whole CMS object
  inflates every page. Pass what the component renders.

Vanilla script, when that's all you need:

```astro
<button id="menu" aria-expanded="false">Menu</button>

<script>
  const btn = document.querySelector('#menu');
  btn?.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
  });
</script>
```

Astro bundles and scopes this. Use `is:inline` only when the script must not be processed
(third-party snippets) — inline scripts are not bundled, not deduplicated, and are the
usual thing a CSP breaks.

## Server islands

For request-time content inside an otherwise static page:

```astro
---
import Recommendations from '../components/Recommendations.astro';
---
<Recommendations server:defer productId={id}>
  <div slot="fallback" class="skeleton" aria-hidden="true"></div>
</Recommendations>
```

The page is cached and served instantly; the island is fetched separately.

Rules:

- Requires an adapter.
- Props must be serializable: primitives, plain objects, `Array`, `Map`, `Set`, `Date`,
  `RegExp`, `BigInt`, `URL`, typed arrays. **No functions, no circular references.**
- Props travel in an encrypted GET query string. Past roughly 2048 bytes it becomes a POST,
  which is not cacheable. Pass an ID and refetch server-side rather than a payload.
- `Astro.url` inside the island is the island's own endpoint, not the page. Read the
  `Referer` header if you need the page URL.
- Rolling deploys can mismatch encryption keys mid-rollout. Generate a stable key with
  `astro create-key` and set `ASTRO_KEY` in the environment.
- Always provide a `fallback` slot sized like the real content, or the page shifts (CLS).

## State across islands

Separate islands are separate roots — a React context or a shared module-level variable in
one does not reach another.

- Prefer restructuring so a single island owns the shared state.
- If two islands genuinely must share, use a framework-agnostic store (nanostores) that
  both import, or `CustomEvent` on `window` for simple signals.
- `localStorage` for state that must survive navigation.

## With view transitions

When `<ClientRouter />` is enabled, islands are re-created on navigation. Scripts that
registered global listeners must clean up or re-register on `astro:page-load`, otherwise
listeners stack up on every navigation. See `references/09-perf-cache-security.md`.
