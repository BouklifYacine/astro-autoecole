# Astro Boilerplate

Boilerplate Astro statique-first pour sites vitrines et landings françaises de TPE/PME.

## Démarrage

```bash
bun install
bun run dev
```

Le site de démonstration fonctionne avec des placeholders. Pour un projet réel :

```bash
bun run init
```

## Vérification

```bash
bun run check
bun run test
bun run build
```

Le site utilise Astro 7.2.x, l’adaptateur Cloudflare 14.2.x, React uniquement pour les îlots interactifs et les Content Collections actuelles dans `src/content.config.ts`.

L’API de formulaire est la seule route `prerender = false`. Ses bindings Cloudflare sont lus depuis `cloudflare:workers`; `Astro.locals.runtime.env` n’est plus utilisé.

Lire [BOILERPLATE-PLAN.md](./BOILERPLATE-PLAN.md), [CONTRACTS.md](./docs/CONTRACTS.md) et [CHECKLIST-NOUVEAU-PROJET.md](./docs/CHECKLIST-NOUVEAU-PROJET.md) avant un déploiement.
