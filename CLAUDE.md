# Astro Boilerplate

- Read `BOILERPLATE-PLAN.md` before changing the architecture.
- Keep `src/config/site.config.ts`, `src/content/`, and environment secrets as the three sources of truth.
- Keep the project static-first. Only `src/pages/api/` may use `prerender = false`.
- Provider SDKs and provider-specific runtime access belong in `src/lib/adapters/`.
- Use `astro:assets` for processed local images and explicit hydration directives for islands.
- Run `bun run check`, `bun run test`, and `bun run build` after structural changes.
