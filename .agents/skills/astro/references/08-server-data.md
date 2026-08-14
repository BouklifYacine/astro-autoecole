# Middleware, actions, sessions & environment

Everything here except build-time middleware requires on-demand rendering. Putting any of
it on a prerendered page fails, often without an error.

## Middleware

```ts
// src/middleware.ts
import { defineMiddleware, sequence } from 'astro:middleware';

const auth = defineMiddleware(async (context, next) => {
  context.locals.user = await getUser(context.cookies);
  if (context.url.pathname.startsWith('/app') && !context.locals.user) {
    return context.redirect('/login');
  }
  return next();
});

export const onRequest = sequence(auth);
```

- Named export `onRequest`. A default export is silently ignored.
- Type `locals` once, globally:

```ts
// src/env.d.ts
declare namespace App {
  interface Locals { user: User | null }
  interface SessionData { cart: string[] }
}
```

- On prerendered pages middleware runs **at build time** — no cookies, no headers.
- `next('/other')` creates a new Request. Reading `request.body` on both sides of that
  throws.
- Do not reassign `locals` wholesale; mutate its properties.
- If middleware throws, `Astro.locals` is unavailable in the error page — never assume it
  exists in `500.astro`.

## Actions

Type-safe server functions with validation, for forms and mutations.

```ts
// src/actions/index.ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
  subscribe: defineAction({
    accept: 'form',
    input: z.object({
      email: z.email(),
      consent: z.coerce.boolean(),
    }),
    handler: async ({ email }, context) => {
      if (await exists(email)) {
        throw new ActionError({ code: 'CONFLICT', message: 'Already subscribed' });
      }
      await save(email);
      return { ok: true };
    },
  }),
};
```

```astro
---
export const prerender = false;   // required
import { actions } from 'astro:actions';

const result = Astro.getActionResult(actions.subscribe);
if (result && !result.error) return Astro.redirect('/thanks');
---
<form method="POST" action={actions.subscribe}>
  <input type="email" name="email" required />
  <button>Subscribe</button>
  {result?.error && <p role="alert">{result.error.message}</p>}
</form>
```

Form input rules:

- `accept: 'form'` for HTML forms; JSON is the default.
- Checkboxes need `z.coerce.boolean()`, numbers `z.number()`, files `z.instanceof(File)`
  with `enctype="multipart/form-data"`.
- Empty fields arrive as `null`, except arrays and booleans.
- `isInputError(error)` gives a `fields` map for per-field messages.
- `security.actionBodySizeLimit` defaults to 1 MB — uploads above it are rejected.

Call an action from server code with `Astro.callAction()`, from the client by importing
`actions` and reading `{ data, error }`.

## Sessions

```js
import { defineConfig, sessionDrivers } from 'astro/config';

export default defineConfig({
  session: {
    driver: sessionDrivers.lruCache({ max: 800 }),
    ttl: 60 * 60 * 24,
  },
});
```

Node, Cloudflare, and Netlify adapters configure a default driver; others need one
explicitly. `session: false` removes the machinery entirely — worth doing on a static
marketing site.

```astro
---
const cart = (await Astro.session.get('cart')) ?? [];
await Astro.session.set('cart', [...cart, id]);
---
```

`get`, `set`, `destroy`, `regenerate`. Available as `context.session` in middleware,
endpoints, and actions. Values are serialized with devalue, so `Date`, `Map`, `Set`, and
`URL` survive; class instances do not.

**Sessions do not work in edge middleware.** Regenerate the session ID on privilege change
(login) to prevent fixation.

## Endpoints

See `references/01-rendering-routing.md` for the routing rules. Validate the body with the
same Zod schemas the rest of the app uses, and return real status codes.

## Environment variables

`import.meta.env` values are **always inlined at build time and never type-coerced** —
everything is a string. `import.meta.env.PORT` is `"3000"`, not `3000`.

Only `PUBLIC_`-prefixed variables reach client code. Everything else is server-only.

Schema-validated access:

```js
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      PUBLIC_SITE_NAME: envField.string({ context: 'client', access: 'public' }),
      CMS_TOKEN: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
```

```ts
import { CMS_TOKEN } from 'astro:env/server';
import { PUBLIC_SITE_NAME } from 'astro:env/client';
```

Traps:

- `astro:env` cannot be used **inside `astro.config.*`** — use `process.env` or Vite's
  `loadEnv()` there.
- `.env` files are not loaded in the config file either.
- `.env` is not loaded at runtime by the Node adapter — inject real env vars.
- On Cloudflare, read secrets from `cloudflare:workers` inside a request, not at module
  scope.
- A secret becomes public the moment someone renames it with a `PUBLIC_` prefix. Review
  that in code review.

## Request security

`security.checkOrigin` defaults to `true` and rejects cross-origin form posts.
`security.allowedDomains` whitelists host patterns for incoming requests. Behind a proxy
that rewrites `Host`, a legitimate request can be rejected — that is a configuration bug,
not a reason to disable the check.
