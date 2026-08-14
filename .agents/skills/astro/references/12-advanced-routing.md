# Advanced routing — the fetch entrypoint

## Use this almost never

`src/middleware.ts` covers auth, redirects, locals, logging, and header manipulation.
Reach for a custom fetch pipeline only when you must run code **before Astro touches the
request**, **between pipeline stages**, or **after the response is produced** — mounting
Astro inside another framework, custom protocol handling, or instrumentation that has to
wrap the entire pipeline.

The cost of getting it wrong is high: an incomplete pipeline disables i18n, actions,
sessions, or trailing-slash handling with no error message.

## The entrypoint

`src/fetch.ts` is a **reserved filename**. If the project already has a file with that
name for something else, rename it or set `fetchFile` (default `'fetch'`) in the config.

```ts
import { FetchState, astro } from 'astro/fetch';

export default {
  async fetch(request: Request): Promise<Response> {
    const state = new FetchState(request);
    const started = Date.now();

    const response = await astro(state);          // the complete standard pipeline

    response.headers.set('Server-Timing', `total;dur=${Date.now() - started}`);
    return response;
  },
};
```

`astro(state)` runs everything in the right order: sessions → cache → redirects →
trailing slash → actions → middleware → pages → i18n. **If all you need is code around the
pipeline, use it** and don't assemble the stages yourself.

## FetchState

Construct it first — it resolves the matched route.

| Property | |
|---|---|
| `request` | the incoming `Request` |
| `url` | normalized URL |
| `pathname` | base-stripped, decoded path |
| `routeData` | matched route, or `undefined` |
| `params` | route params |
| `cookies` | `AstroCookies` |
| `locals` | request-scoped data, same object middleware sees |
| `status` | defaults to `200` |
| `response` | `undefined` until a handler produces it |

`state.rewrite(payload)` re-dispatches to another route.

## Assembling stages manually

```ts
import { FetchState, sessions, redirects, trailingSlash, actions, middleware, pages, i18n } from 'astro/fetch';

export default {
  async fetch(request: Request): Promise<Response> {
    const state = new FetchState(request);

    sessions(state);                                   // before middleware

    const early = redirects(state) ?? trailingSlash(state);
    if (early) return early;                           // both return undefined when idle

    const actionResponse = await actions(state);
    if (actionResponse) return actionResponse;

    const response = await middleware(state, (s) => pages(s));
    return i18n(state, response);                      // after rendering
  },
};
```

Order is not cosmetic:

- `sessions()` must run before middleware, or `context.session` is unavailable.
- `redirects()` and `trailingSlash()` return `undefined` when there is nothing to do —
  check the return value instead of returning it blindly.
- `pages()` is what actually renders. Omit it and every route 404s.
- `i18n()` post-processes the response — locale redirects, invalid-locale 404s, fallbacks.
  Calling it before rendering does nothing.
- `cache()` wraps rendering: `cache(state, () => pages(state))`.

Omitting a stage silently removes that feature. If actions stop working after a pipeline
rewrite, `actions()` is missing.

## Hono

```ts
import { astro } from 'astro/hono';
```

Mounts the Astro pipeline as a Hono handler, so Astro can live alongside an existing Hono
app. The same completeness rules apply.

## Verifying

A custom pipeline needs explicit checks, because failures are silent. After changing it,
confirm in `astro build && astro preview`: a normal page renders, a configured redirect
fires, a trailing-slash variant normalizes, a form action round-trips, a session value
persists, and — if i18n is configured — a locale URL resolves.
