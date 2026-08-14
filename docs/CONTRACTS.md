# Contrats de la boilerplate

Ces invariants sont les garde-fous de départ. Les six premiers sont testés dès P0 ; les autres sont vérifiés par le build ou ajoutés quand un projet réel les rend nécessaires.

| ID | Contrat | Vérification |
| --- | --- | --- |
| I1 | Aucune valeur client réelle hors de `src/config/site.config.ts`, `src/content/` et l’environnement | Scan des valeurs connues dans `src/` |
| I2 | Aucune route hors de `/api/` ne porte `prerender = false` | Scan de `src/pages/` |
| I3 | Aucun `<img>` brut pour un asset local | Scan du source ; utiliser `astro:assets` |
| I4 | Le HTML final contient `width` et `height` pour chaque image | Parsing du build |
| I5 | Aucun `client:load` sans justification écrite | Scan + liste blanche |
| I6 | SEO essentiel dans le HTML initial | Parsing du build sans exécuter le JavaScript |
| I7 | `title` et `description` uniques sur les pages publiées | Scan du build |
| I8 | La route 404 répond avec un statut HTTP 404 | Requête post-build |
| I9 | Chaque URL du sitemap répond 200 | Crawl post-build |
| I10 | LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 200 ms et JS sous budget en laboratoire | `scripts/perf.mjs` |
| I11 | Aucun secret dans un bundle client | `astro:env` : secret = serveur uniquement |
| I12 | Les interactions utilisent de vrais éléments sémantiques | Audit manuel + axe/pa11y en P2 |
| I13 | Aucun SDK fournisseur hors de `src/lib/adapters/` | Scan des imports |

## Décisions de compatibilité actuelles

- Astro 7.2.x est utilisé avec `@astrojs/cloudflare` 14.2.x. L’adaptateur Cloudflare exige Astro 7.2.0 ou supérieur.
- Les bindings Cloudflare sont lus depuis `cloudflare:workers`. `Astro.locals.runtime.env` est supprimé dans les versions actuelles.
- Les variables typées passent par `astro:env/client` et `astro:env/server`. Les secrets runtime restent des bindings Cloudflare ou des secrets de l’hébergeur.
- Les collections build-time sont déclarées dans `src/content.config.ts` avec `astro/loaders`. Le chemin racine `content.config.ts` n’est plus le choix actuel.
- La pagination utilise `blog/[...page].astro`; les articles utilisent `blog/[slug].astro` pour éviter deux routes catch-all concurrentes.
- Lighthouse mesure le TBT en laboratoire, pas l’INP. L’INP reste une mesure de terrain informative.
