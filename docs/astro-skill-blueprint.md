# Blueprint — Skill Astro sur mesure

> Document de conception. Inventaire exhaustif de ce que le skill doit couvrir, avant écriture.
> **Base de vérité : Astro 7.2.1**, versions relevées sur le registre npm le **2026-08-12**.

---

## 0. Versions vérifiées (source : `npm view <pkg> version`)

| Paquet | Version | Note pour le skill |
|---|---|---|
| `astro` | **7.2.1** | `engines`: **node >= 22.12.0**, npm >= 9.6.5, pnpm >= 7.1.0 |
| `vite` | **8.2.1** | Astro 7 embarque Vite 8 → bundler **Rolldown** (Rust), remplace esbuild + Rollup |
| `zod` | **4.4.3** | Import depuis `astro/zod` |
| `shiki` | **4.4.3** | Coloration syntaxique |
| `@astrojs/cloudflare` | **14.2.1** | Workers uniquement (Pages abandonné) |
| `@astrojs/vercel` | **11.0.5** | |
| `@astrojs/node` | **11.1.1** | |
| `@astrojs/netlify` | **8.2.1** | (hors périmètre, pour référence) |
| `@astrojs/react` | **6.0.2** | |
| `@astrojs/mdx` | **7.0.5** | |
| `@astrojs/sitemap` | **3.7.3** | |
| `@astrojs/rss` | **4.0.19** | |
| `@astrojs/partytown` | **2.1.7** | |
| `@astrojs/markdown-remark` | **7.2.2** | **N'est plus installé par défaut** en v7 |
| `tailwindcss` / `@tailwindcss/vite` | **4.3.3** | |
| `@astrojs/db` | **supprimé** | Paquet retiré et non maintenu en v7 |

**Règle n°1 du skill** : ces numéros vieilliront. Le skill doit *imposer* la lecture de `package.json` + lockfile avant toute recommandation, et ne jamais traiter ce tableau comme la vérité courante.

---

## 1. Contexte & décisions

| Décision | Choix retenu |
|---|---|
| Adaptateurs couverts en profondeur | **Cloudflare Workers**, **Vercel**, **Node / VPS / Docker** |
| Types de projet cibles | **Site vitrine / marketing** + **Blog / contenu / docs** |
| Intégrations documentées | **Tailwind v4 + design system**, **islands React/Vue/Svelte**, **CMS headless / data externe**, **SEO / i18n / analytics** |
| Format | **SKILL.md court (routeur) + `references/` modulaires** chargés à la demande |

### Conséquences directes

- Vitrine + blog ⇒ **`output: 'static'` par défaut**, on-demand à la carte (`export const prerender = false`) ou **server islands**. Le skill doit *décourager* `output: 'server'` global.
- Trois adaptateurs ⇒ **matrice de portabilité** obligatoire, sinon le code écrit pour Cloudflare casse sur Node.
- CMS headless ⇒ **loaders Content Layer custom** + **live collections** + stratégie d'invalidation, désormais adossée au **cache de routes stable en v7** (`tags` + `cache.invalidate`).

---

## 2. État des lieux des skills existants

| Skill | Verdict | Détail |
|---|---|---|
| `.agents/skills/astro-expert/` (Smithery) | **À supprimer** | Texte tronqué en plein milieu (`"Write concise, techni"`). Faux sur ≥ 3 points : recommande `Astro.glob()` (supprimé en v6), `src/content/config.ts` (déplacé), impose Tailwind comme règle Astro. Sa « Iron Law » n°5 porte sur une API morte. Pointe vers un fichier mémoire inexistant. |
| `.agents/skills/astro-framework-specialist/` | **Base à reprendre** | Bon ton, bon workflow d'inspection, bonne checklist de revue. Mais : vocabulaire « hybrid » (mode supprimé en v5), rien sur les adaptateurs, le routing avancé, le déploiement, le SEO/i18n, le cache, ni sur quoi que ce soit de v6/v7. |

**Plan** : nouveau skill `astro`, absorbant le meilleur de `astro-framework-specialist` ; suppression des deux anciens + de l'entrée dans `skills-lock.json`.

---

## 3. Architecture de fichiers proposée

```
.agents/skills/astro/
├── SKILL.md                      # ~150 lignes : identité, workflow, arbre de décision, table de routage
├── references/
│   ├── 01-rendering-routing.md   # static/server, prerender, routing, priorité, redirects, rewrites, endpoints
│   ├── 02-adapters.md            # Cloudflare / Vercel / Node : matrice + config + pièges
│   ├── 03-content.md             # Content Layer, loaders, Zod 4, live collections, CMS headless
│   ├── 04-islands.md             # hydratation, client:*, server:defer, state partagé
│   ├── 05-styling.md             # Tailwind v4, styles scoped, cascade, design tokens
│   ├── 06-assets.md              # astro:assets, responsive images, Fonts API, OG images
│   ├── 07-seo-i18n.md            # sitemap, robots, canonical, hreflang, i18n, schema.org
│   ├── 08-server-data.md         # middleware, actions, sessions, endpoints, env & secrets
│   ├── 09-perf-cache-security.md # budget JS, CWV, cache de routes + routeRules, CSP, prefetch
│   ├── 10-integrations-api.md    # hooks d'intégration, injectRoute, audit d'une intégration tierce
│   ├── 11-markdown.md            # Sätteri, plugins mdast/hast, repli unified, MDX
│   ├── 12-advanced-routing.md    # src/fetch.ts, astro/fetch, FetchState, astro/hono
│   └── 13-versions-migration.md  # détection de version + breaking changes v5→v6→v7
└── agents/openai.yaml            # manifeste de découverte Codex

.claude/skills/astro/SKILL.md     # point d'entrée léger → pointe vers .agents/ (aucun contenu dupliqué)
```

**Règle de chargement** (dans SKILL.md) : max 2 références par tâche ; table « symptôme → fichier ».

Pas de `templates/` ni de `checklists/` : les snippets vivent dans les fichiers de
référence et la checklist de revue dans le SKILL.md. Une seule source, rien à synchroniser.

---

## 4. TABLE MAÎTRESSE — modules × contenu × pièges

Priorité : **P0** = sans ça le skill est inutile · **P1** = fort différenciant · **P2** = confort.

| # | Module | Ce que le skill doit contenir | Piège principal évité | Prio |
|---|---|---|---|---|
| 01 | Rendu & routing | Arbre de décision static/on-demand, `prerender` par route, ordre de priorité des routes, `getStaticPaths`, rest params, redirects, rewrites, 404/500, endpoints | Passer tout le site en `output: 'server'` pour une page dynamique | P0 |
| 02 | Adaptateurs | Matrice CF/Vercel/Node, config type, bindings, limites runtime, headers | Écrire du code Node (`fs`, `process.env`) qui casse sur workerd | P0 |
| 03 | Contenu | `src/content.config.ts`, loaders `glob`/`file`/custom, Zod 4, `reference()`, `render()`, live collections | `Astro.glob()` (supprimé) ou l'ancien `src/content/config.ts` | P0 |
| 04 | Islands | Choix de directive, coût JS réel, `server:defer`, state partagé | `client:load` partout ⇒ Astro devient un SPA lent | P0 |
| 05 | Styling | Tailwind 4 via `@tailwindcss/vite`, scoped styles, `is:global`, cascade | `@astrojs/tailwind` (obsolète) | P1 |
| 06 | Assets | `<Image>`/`<Picture>`, `layout`, `priority`, remote patterns, Fonts API | Image service incompatible avec l'adaptateur | P0 |
| 07 | SEO & i18n | sitemap, canonical, OG, JSON-LD, hreflang, config i18n | `redirectToDefaultLocale` dont le défaut a changé | P1 |
| 08 | Serveur & données | Middleware, Actions, Sessions, endpoints, `astro:env` | Action ou session sur une page prerendue | P0 |
| 09 | Perf, cache & sécurité | Budget JS, CWV, **`cache` + `routeRules` (stable v7)**, CSP, prefetch | Cache configuré mais testé en dev (où il ne s'applique pas) | P0 |
| 10 | API d'intégration | Hooks, `injectRoute`, `addMiddleware`, audit d'une intégration tierce | Intégration non maintenue qui bloque la montée de version | P2 |
| 11 | Markdown | **Sätteri** (défaut v7), `features`, plugins mdast/hast, repli `unified()` | Plugin remark/rehype qui ne se charge plus | P0 |
| 12 | Routing avancé | `src/fetch.ts`, `astro/fetch`, `FetchState`, `astro/hono`, `fetchFile` | Pipeline custom incomplet ⇒ i18n/actions/sessions silencieusement cassés | P1 |
| 13 | Versions & migration | Détection de version, breaking changes v5→v6→v7 | Appliquer des patterns Astro 4/5 sur un projet 7 | P0 |

---

## 5. Détail par domaine

### A. Rendu & routing (`01-rendering-routing.md`)

| Sujet | Contenu du skill | Piège / erreur classique | Prio |
|---|---|---|---|
| Modes de sortie | `output: 'static'` (défaut) ou `'server'`. **`'hybrid'` n'existe plus** | Le skill actuel en parle encore | P0 |
| Opt-in/out par route | `export const prerender = false` / `= true` | Le fichier entier bascule, pas juste un composant | P0 |
| Arbre de décision | Donnée à la requête ? cookie/session ? perso ? → sinon static | Passer en server « au cas où » | P0 |
| Priorité des routes | 1. réservées (`_astro/`, `_server_islands/`, `_actions/`) · 2. plus spécifique · 3. statique > dynamique · 4. `[param]` > `[...rest]` · 5. dynamique prerendue > serveur · 6. endpoints > pages · 7. fichiers > redirects · 8. alphabétique | `[...slug].astro` à la racine qui avale tout | P0 |
| `getStaticPaths()` | `{ params, props }`, `paginate()`, un seul rest param par fichier | Y accéder à `Astro.request`/cookies | P0 |
| Redirects config | `redirects: { '/old': '/new', '/old/[...s]': '/new/[...s]' }`, `{ status, destination }` en SSR | Croire qu'un redirect override un fichier existant | P1 |
| Rewrites | `Astro.rewrite()` / `next('/path')` — re-exécute le middleware | Boucle de rewrite | P1 |
| Endpoints | `src/pages/api/*.ts`, exports `GET`/`POST`, `Response` standard | Pas de trailing slash sur les endpoints à extension | P1 |
| 404/500 | `src/pages/404.astro`, `500.astro`, comportement par adaptateur | 404 custom non servie en static | P1 |
| `trailingSlash` | Cohérence config ↔ liens ↔ canonical ↔ redirects hébergeur | Double 301 pénalisant en SEO | P1 |
| Exclusion | Préfixe `_` | Composants dans `src/pages/` | P2 |

### B. Adaptateurs (`02-adapters.md`)

**Matrice de portabilité — le tableau le plus utile du skill :**

| Capacité | Cloudflare Workers (14.2.1) | Vercel (11.0.5) | Node (11.1.1) |
|---|---|---|---|
| Runtime | `workerd` (dev **et** prod) | Node serverless / edge | Node ≥ 22.12 |
| API Node | Partiel : `nodejs_compat` + compat date ≥ 2024-09-23 | Complet | Complet |
| Env / bindings | `import { env } from 'cloudflare:workers'` — **`Astro.locals.runtime` supprimé** | `process.env` | `process.env` |
| Secrets locaux | `.dev.vars` + `wrangler secret put` | `.env` + dashboard | `.env` (non chargé automatiquement) |
| Sessions | KV auto-provisionné (`sessionKVBindingName`, défaut `'SESSION'`) | driver à configurer | filesystem par défaut |
| Images | `imageService` défaut **`'cloudflare-binding'`** (+ `imagesBindingName`, défaut `'IMAGES'`) ; aussi `'cloudflare'`, `'passthrough'`, `'compile'` | Vercel Image Optimization + `devImageService` | `sharp` |
| Cache CDN (exp.) | `cacheCloudflare()` depuis `@astrojs/cloudflare/cache` | `cacheVercel()` + **ISR** natif | `memoryCache()` ou reverse proxy |
| Prérendu | `prerenderEnvironment: 'workerd' \| 'node'` (défaut `workerd`) | node | node |
| Streaming HTML | oui | oui | oui (`experimentalDisableStreaming` pour couper) |
| Middleware edge | via Workers | `edgeMiddleware` + `middlewareMode: 'edge'` (locals sérialisés JSON) | n/a |
| Contexte plateforme | `Astro.request.cf`, `Astro.locals.cfContext` (`waitUntil`) | headers Vercel | headers proxy |
| Statiques | assets Workers + `_headers` / `_redirects` | automatique | servis par l'adaptateur ou CDN |

**Spécificités par adaptateur :**

| Adaptateur | À couvrir | Pièges |
|---|---|---|
| Cloudflare | `wrangler.jsonc` minimal (`name` + `main: "@astrojs/cloudflare/entrypoints/server"`), `wrangler types`, bindings D1/KV/R2, entrypoint Worker custom, multi-env (`CLOUDFLARE_ENV=... astro build && wrangler deploy`) | **Support Pages supprimé** · deps CommonJS qui explosent dans workerd · prérendu dans workerd par défaut · KV en cohérence éventuelle (~60 s) |
| Vercel | `isr` (`expiration`, `bypassToken`, exclusions), `maxDuration`, `imagesConfig`, `webAnalytics`, `skewProtection` | ISR ignore les query params · edge middleware sérialise `locals` en JSON |
| Node | `mode: 'standalone' \| 'middleware'`, `HOST`/`PORT`, `SERVER_CERT_PATH`, `bodySizeLimit` (1 Go), `staticHeaders`, Dockerfile type | En mode middleware **les statiques ne sont pas servis** · `.env` non chargé automatiquement |
| Aucun (static) | Build 100 % statique, hébergement objet/CDN | Action/session/middleware runtime sans adaptateur |

**Règle transverse** : si le projet vise plusieurs cibles, isoler l'accès plateforme derrière `src/lib/platform.ts`.

### C. Contenu & CMS (`03-content.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Content Layer | `src/content.config.ts` + `defineCollection({ loader, schema })` | Ancien `src/content/config.ts`, collections legacy supprimées | P0 |
| Loaders builtin | `glob()` (1 fichier = 1 entrée), `file()` (1 fichier = N entrées, `id` requis) | `file()` sans `id` explicite | P0 |
| Loaders custom | Loader API pour CMS/API/DB, cache & `digest`, `store` | Refetch complet à chaque build | P1 |
| Schémas | **Zod 4** depuis `astro/zod`, `z.email()` et non `z.string().email()`, `createSchema()` côté loader | Copier des schémas Zod 3 | P0 |
| Références | `reference('authors')` + résolution via `getEntry()` | Rendre la référence sans la résoudre | P1 |
| Rendu | `render(entry)` → `<Content />` + `headings` | Ancien `entry.render()` | P1 |
| Requêtes | `getCollection(name, filter)`, `getEntry()` | **Ordre non déterministe** : trier explicitement | P0 |
| Drafts | Schéma + filtre, distinction dev/prod | Drafts publiés en prod | P1 |
| Live collections | `src/live.config.ts`, `defineLiveCollection`, `getLiveCollection`/`getLiveEntry`, erreurs explicites, `cacheHint` + tags lus automatiquement par le cache v7 | **Pas de MDX, pas d'optimisation d'image, pas de persistance** · adaptateur requis | P1 |
| Images de contenu | helper `image()` dans le schéma | Chemin string au lieu de l'import | P1 |
| CMS headless | Sanity / Storyblok / Directus / Notion : loader custom vs client direct, preview/draft, webhook → rebuild **vs** live collection + `cache.invalidate({ tags })` | Fetch CMS dans le frontmatter d'un composant (N+1) | P1 |
| `@astrojs/db` | **Supprimé en v7** : documenter `node:sqlite`, Drizzle, ou base externe | Proposer Astro DB | P1 |
| Sync | `astro sync` / `s + Enter` après changement de schéma | Types périmés | P2 |

### D. Islands & hydratation (`04-islands.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Décision | statique → `.astro` · interaction → island · donnée requête → `server:defer` | React pour du markup statique | P0 |
| Directives | `client:load` / `idle` / `visible` (+ `{rootMargin}`) / `media` / `only` | `client:load` réflexe | P0 |
| Absence de directive | Volontaire = HTML statique, 0 JS framework | La « corriger » | P0 |
| `client:only` | Nom du framework requis, casse SSR/SEO | Utilisé pour masquer une erreur SSR | P1 |
| Server islands | `server:defer`, slot `fallback`, props **sérialisables** (pas de fonctions ni cycles), GET chiffré ~2048 o puis POST non caché | `Astro.url` = URL de l'island (lire `Referer`) · déploiements rolling → `ASTRO_KEY` via `astro create-key` | P1 |
| State partagé | nanostores, ou remonter l'état dans un island unique | Context React entre islands séparés | P1 |
| Scripts vanilla | `<script>` bundlé/scoped vs `is:inline` vs island | 40 ko de framework pour un menu burger | P0 |
| Props | Coût de sérialisation dans le HTML | Passer un objet CMS entier | P1 |

### E. Styling & design system (`05-styling.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Tailwind v4 | `astro add tailwind` → **`@tailwindcss/vite`** + `@import "tailwindcss";` | Garder `@astrojs/tailwind` (v3, obsolète) | P0 |
| Design tokens | `@theme` Tailwind 4, variables CSS, dark mode | Tokens dupliqués entre Tailwind et CSS scoped | P1 |
| Styles scoped | Scoping par défaut, `:global()`, `is:global` | `is:global` généralisé | P1 |
| Ordre de cascade | `<link>` < imports < scoped ; **scripts et styles rendus dans l'ordre de déclaration depuis v6** | Régression visuelle silencieuse | P1 |
| Compilation CSS | Le compilateur Rust utilise **Lightning CSS** pour le scoping : couleurs nommées sérialisées en hex, guillemets d'`url()` modifiés (cosmétique) | Diff CSS interprété comme une régression | P2 |
| `define:vars` | Variables serveur → CSS | Valeur non sérialisable | P2 |
| Inline vs link | `build.inlineStylesheets: 'auto'`, `assetsInlineLimit` | CSS critique bloquant | P2 |
| `class:list` | Composition conditionnelle | Concaténation manuelle | P2 |

### F. Assets : images & fonts (`06-assets.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| `<Image />` | Import depuis `src/`, dimensions inférées, `alt` obligatoire | `<img>` brut sur image locale optimisable | P0 |
| `<Picture />` | `formats={['avif','webp']}` + fallback | 6 formats inutiles | P2 |
| Responsive | `layout: 'constrained' \| 'full-width' \| 'fixed'`, `priority`, `fit`, `position` ; **`image.responsiveStyles` est à `false` par défaut** | Pas de `priority` sur l'image LCP ; croire le responsive actif par défaut | P0 |
| Sources | `src/` (optimisé) vs `public/` (brut) vs distant (autorisation) | Distant non optimisé faute de `image.domains`/`remotePatterns` | P1 |
| `getImage()` | Génération programmatique (OG, endpoints) | **Throw si appelé côté client** | P1 |
| Services | `sharp` (défaut), `passthrough`, no-op, service hébergeur | Incompatibilité avec l'adaptateur (cf. matrice B) | P0 |
| Comportements | Crop par défaut sans `fit` · **jamais d'upscaling** · `format` rasterise les SVG | Rendu qui change après migration | P1 |
| SVG | Composant SVG importé, props `width`/`height`/`fill` ; flag exp. `svgOptimization` | **Indisponible dans un composant framework** | P1 |
| Fonts API | `fonts: [{ provider, name, cssVariable, weights, subsets, fallbacks }]` + `<Font cssVariable preload />` depuis `astro:assets` | Preload de toutes les fontes ⇒ concurrence avec le LCP | P1 |
| Fallbacks | `optimizedFallbacks` (réduction du CLS) | Désactiver sans mesurer | P2 |
| OG images | Endpoint + `experimental_getFontFileURL()` | Police introuvable en runtime edge | P2 |

### G. SEO, i18n, analytics (`07-seo-i18n.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Composant `<SEO>` | title/description, canonical absolue, OG, Twitter, robots | Balises dupliquées layout ↔ page | P0 |
| `site` | Obligatoire pour canonical/sitemap/RSS | Canonical relative | P0 |
| Sitemap | `@astrojs/sitemap`, filtres, `customPages`, i18n | Pages noindex dans le sitemap | P1 |
| robots.txt | Généré ou statique + lien sitemap | robots de staging copié en prod | P1 |
| JSON-LD | Organization / WebSite / Article / BreadcrumbList | Schema inventé non validé | P1 |
| RSS | `@astrojs/rss` + collection blog | Dates invalides / contenu tronqué | P1 |
| i18n routing | `i18n: { locales, defaultLocale, routing, fallback, domains }`, `prefixDefaultLocale`, `manual` | `redirectToDefaultLocale` : défaut `false`, actif seulement si `prefixDefaultLocale: true` | P1 |
| Helpers | `getRelativeLocaleUrl()`, `Astro.currentLocale`, `Astro.preferredLocale` | URLs de langue codées en dur | P1 |
| hreflang | Générés depuis la config, self-référence incluse | hreflang sans réciprocité | P1 |
| Fallback de langue | `fallbackType: 'redirect' \| 'rewrite'` | Contenu non traduit exposé sans hreflang correct | P2 |
| Analytics | `is:inline` ou `@astrojs/partytown`, consentement, impact CWV | Tag manager qui annule le budget JS | P2 |

### H. Serveur, formulaires & données (`08-server-data.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Middleware | `src/middleware.ts`, `onRequest(context, next)`, `defineMiddleware()`, `sequence()` | Export `default` au lieu de `onRequest` | P0 |
| `locals` | Typage `App.Locals` dans `env.d.ts` | Réassigner `locals` · indisponible en page d'erreur si le middleware a planté | P1 |
| Exécution | Build-time pour les pages prerendues, requête pour l'on-demand | Attendre les cookies sur une page statique | P0 |
| Actions | `defineAction({ input, accept, handler })`, `Astro.getActionResult()`, `isInputError()`, `ActionError`, POST/Redirect/GET | **Exige l'on-demand** : formulaire sur page prerendue = échec | P0 |
| Validation form | `z.coerce.boolean()`, `z.instanceof(File)`, champs vides = `null` | Schéma JSON appliqué à un `FormData` | P1 |
| Limites | `security.actionBodySizeLimit` (défaut **1 Mo**) | Upload silencieusement rejeté | P1 |
| Endpoints | `GET`/`POST`, `Response`, `APIContext` | Endpoint prerendu qui lit le body | P1 |
| Sessions | `session: { driver: sessionDrivers.x(...), ttl }`, `Astro.session.get/set/destroy/regenerate`, `App.SessionData`, `session: false` | **Non supporté en edge middleware** · drivers par défaut seulement Node/CF/Netlify | P1 |
| Env vars | `PUBLIC_` pour le client ; `import.meta.env` **toujours inliné, jamais coercé** (tout est string) | `import.meta.env.PORT` traité comme number | P0 |
| `astro:env` | `envField`, `context`/`access`, `getSecret()` | Inutilisable **dans `astro.config`** · `.env` non chargé dans la config | P1 |
| Sécurité requêtes | `security.checkOrigin` (défaut `true`), `security.allowedDomains` | Origine légitime bloquée derrière un proxy | P1 |

### I. Perf, cache & sécurité (`09-perf-cache-security.md`)

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Budget JS | Objectif 0 ko sur vitrine/blog, mesure par island | « C'est Astro donc c'est rapide » | P0 |
| **Cache de routes** (stable v7) | `cache: { provider: memoryCache() }` depuis `astro/config` ; `routeRules: { '/blog/[...slug]': { maxAge: 300, swr: 60, tags: [...] } }` ; `Astro.cache.set()` en page, `context.cache.set()` en endpoint/middleware ; `cache.invalidate({ tags })` / `({ path })` ; `false` pour opt-out | **En dev aucun cache n'a lieu (`cache.enabled === false`)** ⇒ tester en build · précédence : code de route > `routeRules` · `set()` multiples : tags cumulés, scalaires en last-write-wins | P0 |
| Providers CDN (exp.) | `cacheCloudflare()`, `cacheVercel()`, `cacheNetlify()` | Croire le provider CDN stable | P1 |
| CWV | LCP (image + fonte), CLS (dimensions, fallbacks), INP (islands) | Optimiser sans mesurer | P1 |
| `<ClientRouter />` | Ex-`<ViewTransitions />` (supprimé), events `astro:page-load` | Listeners dupliqués à chaque navigation | P1 |
| Prefetch | `prefetch` config + `data-astro-prefetch` | Option `with` de `prefetch()` supprimée | P2 |
| CSP | `security: { csp: true }` (défaut `false`), hachage auto scripts/styles, directives custom | CSP qui casse analytics/inline tiers | P1 |
| Headers | `_headers` (CF), `staticHeaders` (Node), config Vercel | Headers de sécurité en static mais absents en SSR | P1 |
| Rendu | **Queued rendering est le défaut en v7** (~2,4× plus rapide), options `pooling`, `contentCache` | Réactiver un flag `experimental` qui n'existe plus | P1 |
| Flags expérimentaux actuels | `clientPrerender`, `contentIntellisense`, `svgOptimization`, `incrementalBuild` | Activer un flag exp. sur un projet client sans le signaler | P2 |

### J. API d'intégration (`10-integrations-api.md`)

| Sujet | Contenu | Prio |
|---|---|---|
| Hooks | `astro:config:setup`, `astro:route:setup`, `astro:routes:resolved`, `astro:config:done`, `astro:server:setup/start/done`, `astro:build:start/setup/ssr/generated/done` | P2 |
| Utilitaires | `updateConfig`, `addRenderer`, `injectRoute`, `injectScript` (`head-inline`/`before-hydration`/`page`/`page-ssr`), `addMiddleware`, `addWatchFile`, `addClientDirective`, `addDevToolbarApp`, `injectTypes`, `createCodegenDir`, `setAdapter`, `setPrerenderer` | P2 |
| Ruptures récentes | `routes` retiré d'`astro:build:done` → `astro:routes:resolved` · `entryPoints` retiré d'`astro:build:ssr` · `astro:ssr-manifest` → `astro:config/server` · `getContainerRenderer()` déplacé vers l'entrypoint `/container-renderer` | P1 |
| Grille d'audit | Maintenue ? compatible v7 ? compatible avec l'adaptateur ? remplaçable en 10 lignes ? coût JS client ? | P1 |

### K. Markdown (`11-markdown.md`) — **nouveau, spécifique v7**

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Processeur par défaut | **Sätteri** (Rust) remplace la chaîne unified/remark/rehype | Supposer que remark fonctionne encore | P0 |
| Fonctionnalités natives | GFM (tables, footnotes, strikethrough, task lists), smart punctuation, IDs de titres, directives de conteneur, math, frontmatter YAML/TOML, sup/sub, wikilinks ; activation via `features` (`directive`, `math`, `headingAttributes`) | Installer un plugin pour une feature déjà native | P1 |
| Plugins | Sätteri = plugins **mdast/hast** ; unified = remark/rehype (+ recma pour MDX) | Écosystème de plugins bien plus petit côté Sätteri | P0 |
| Repli | `npm i @astrojs/markdown-remark` puis `markdown: { processor: unified() }` | Migration bloquée faute de connaître le repli | P0 |
| Coloration | `markdown.syntaxHighlight` défaut `{ type: 'shiki', excludeLangs: ['math'] }` | Config Shiki v3 obsolète | P2 |
| MDX | `@astrojs/mdx` 7.x, composants dans MDX | Live collections ne supportent pas MDX | P1 |
| Ancres | IDs de titres conservant les tirets finaux | Ancres cassées après migration | P1 |

### L. Routing avancé (`12-advanced-routing.md`) — **nouveau, spécifique v7**

| Sujet | Contenu | Piège | Prio |
|---|---|---|---|
| Quand l'utiliser | Uniquement pour insérer de la logique **avant/entre/après** les étapes du pipeline. Le middleware suffit dans 95 % des cas | Réécrire le pipeline pour un besoin que `src/middleware.ts` couvre | P1 |
| Entrypoint | `src/fetch.ts` — **nom de fichier réservé** — export default `{ async fetch(request): Promise<Response> }` ; personnalisable via `fetchFile` (défaut `'fetch'`) | Créer `src/fetch.ts` pour autre chose | P0 |
| `FetchState` | `new FetchState(request)` **en premier** (résout `routeData`) ; propriétés `request`, `url`, `pathname`, `routeData`, `cookies`, `locals`, `params`, `status`, `response` ; méthode `rewrite()` | Instancier tard ⇒ route non résolue | P1 |
| Handlers `astro/fetch` | `astro()` (pipeline complet : sessions → cache → redirects → trailingSlash → actions → middleware → pages → i18n), `sessions()`, `cache()`, `redirects()`, `trailingSlash()`, `actions()`, `middleware()`, `pages()`, `i18n()` | Pipeline partiel ⇒ i18n, actions ou trailing slash silencieusement morts | P1 |
| Ordre | `sessions()` avant le middleware ; `i18n()` **après** le rendu ; `pages()` indispensable | Ordre inversé | P1 |
| Retours `undefined` | `redirects()` et `trailingSlash()` renvoient `undefined` s'il n'y a rien à faire | Ne pas tester la valeur de retour | P1 |
| Hono | `import { astro } from 'astro/hono'` pour monter Astro dans une app Hono | P2 |

### M. Versions & migration (`13-versions-migration.md`)

**Procédure imposée au modèle** : lire `package.json` + lockfile → déterminer la majeure → appliquer *uniquement* les patterns de cette majeure → proposer la migration comme travail séparé.

**Astro 6 → 7 :**

| Changement | Action |
|---|---|
| Vite 8 (bundler Rolldown) | Vérifier les plugins Vite custom |
| **Compilateur Rust seul** (`rustCompiler` stabilisé) | HTML strict : **balise non fermée = erreur**, plus d'auto-correction du nesting invalide |
| **`compressHTML` : `true` → `'jsx'`** | Espaces entre éléments inline supprimés (`<span>hello</span><em>world</em>` → `helloworld`) ⇒ ajouter `{" "}` ou repasser `compressHTML: true` |
| **Markdown : Sätteri par défaut** | Plugins remark/rehype cassés ⇒ porter en mdast/hast, ou `@astrojs/markdown-remark` + `markdown: { processor: unified() }` |
| `queuedRendering`, `rustCompiler`, `advancedRouting`, `cache`, `routeRules`, `logger` stabilisés | **Retirer ces clés du bloc `experimental`** |
| **`@astrojs/db` supprimé** | `node:sqlite`, Drizzle, ou base externe |
| Internes `astro:transitions` supprimés | `TRANSITION_*`, `isTransitionBeforePreparationEvent()`, `isTransitionBeforeSwapEvent()`, `createAnimationScope()` → utiliser les noms d'events en string (`'astro:before-preparation'`…) |
| `getContainerRenderer()` déplacé | Importer depuis `<pkg>/container-renderer` |
| `src/fetch.ts` réservé | Renommer tout fichier existant, ou configurer `fetchFile` |
| Sérialisation CSS | Couleurs nommées → hex, guillemets d'`url()` : cosmétique, ne pas « corriger » |

**Astro 5 → 6 (toujours d'actualité si le projet est en retard) :** Node ≥ 22.12 · Zod 4 depuis `astro/zod` · Shiki 4 · `Astro.glob()` **supprimé** → `import.meta.glob()` / Content Layer · `<ViewTransitions />` → `<ClientRouter />` · collections legacy → `src/content.config.ts` · `emitESMImage()` → `emitImageMetadata()` · config `.cjs`/`.cts` interdite · driver de session en string → `sessionDrivers.x()` · `NodeApp`/`loadManifest()`/`loadApp()`/`createExports()` → `createApp()` depuis `astro/app/entrypoint` + `entrypointResolution: 'auto'` · `context.rewrite()` retiré des Actions · `%25` dans les routes interdit.

### N. Outillage agent (à placer dans SKILL.md) — **spécifique v7, forte valeur**

| Sujet | Contenu | Prio |
|---|---|---|
| Dev server en arrière-plan | `astro dev --background` (auto-détecté en environnement agent), `astro dev stop` / `status` / `logs`, endpoint santé `/_astro/status`, lockfile anti-doublon | P0 |
| Logs structurés | `astro dev --json`, `logHandlers.json()`, `logHandlers.compose(logHandlers.console(), logHandlers.json())`, config top-level `logger` | P1 |
| Vérifications | `astro check`, `astro build`, `astro sync`, `astro preview` | P0 |

> C'est le point le plus sous-exploité : Astro 7 a ajouté des commandes pensées **pour les agents**. Le skill doit les imposer plutôt que de lancer un `npm run dev` bloquant.

---

## 6. Iron laws candidates (max 7)

1. Lire `package.json`, le lockfile, `astro.config.*` et l'adaptateur **avant** d'écrire une ligne d'Astro ; ne jamais supposer la version.
2. Statique par défaut ; l'on-demand se justifie route par route, jamais globalement pour une vitrine ou un blog.
3. Aucune directive `client:*` sans interaction navigateur réelle, et jamais `client:load` sans justification écrite.
4. Tout contenu structuré passe par le Content Layer avec schéma Zod ; `Astro.glob()` n'existe plus.
5. Toute API runtime doit être compatible avec l'adaptateur déclaré ; pas d'API Node sur workerd.
6. Toute image locale optimisable passe par `astro:assets` avec `alt` ; l'image LCP porte `priority`.
7. Aucune dépendance, intégration, adaptateur ou dossier ajouté sans besoin démontré.

## 7. Anti-patterns (table à intégrer telle quelle)

| Anti-pattern | Pourquoi ça échoue | Correctif |
|---|---|---|
| `output: 'server'` pour une page dynamique | Perd le cache CDN sur tout le site | `prerender = false` sur la route, ou server island |
| `client:load` systématique | Hydrate tout au chargement | `visible` / `idle`, ou script vanilla |
| `Astro.glob()` | Supprimé | `getCollection()` / `import.meta.glob()` |
| `src/content/config.ts` | Emplacement legacy | `src/content.config.ts` |
| `@astrojs/tailwind` | Intégration v3 obsolète | `@tailwindcss/vite` + `@import "tailwindcss"` |
| Plugin remark/rehype sans repli | Sätteri est le processeur par défaut en v7 | Porter en mdast/hast ou `processor: unified()` |
| `Astro.locals.runtime` sur Cloudflare | API supprimée par l'adaptateur | `import { env } from 'cloudflare:workers'` |
| Formulaire + Action sur page prerendue | Pas de serveur pour traiter l'action | `prerender = false` sur la page |
| Tester le cache en `astro dev` | Le cache est désactivé en dev | Vérifier en `astro build` + `astro preview` |
| Fetch CMS dans chaque composant | N+1 requêtes au build | Charger une fois dans la page / loader |
| `getCollection()` sans tri | Ordre non déterministe | Trier explicitement |
| Props lourdes dans un `server:defer` | > 2048 o → POST non cachable | Passer un identifiant, refetch côté serveur |
| Balise HTML non fermée | Erreur de compilation avec le compilateur Rust | Fermer les balises non-void |
| Secret sans vérification de préfixe | Fuite dans le bundle client | `astro:env` avec `access: 'secret'` |
| `@astrojs/db` | Paquet supprimé | `node:sqlite`, Drizzle, base externe |

---

## 8. Décisions actées (implémentées le 2026-08-12)

1. **Emplacement** : contenu canonique dans `.agents/skills/astro/` (portable Codex + Claude), avec `agents/openai.yaml` pour la découverte Codex. `.claude/skills/astro/SKILL.md` est un point d'entrée léger qui renvoie vers les fichiers canoniques — **aucun contenu dupliqué**.
2. **Suppression** : `astro-expert` et `astro-framework-specialist` supprimés, `skills-lock.json` vidé de son entrée Smithery.
3. **Templates** : abandonnés. Les snippets sont intégrés aux fichiers de référence, la checklist de revue au SKILL.md. Moins de fichiers, aucune synchronisation.
4. **Hooks** : aucun. Le skill est purement déclaratif — les hooks CJS d'`astro-expert` n'étaient pas portables entre Codex et Claude et constituaient l'essentiel de sa complexité.
5. **Langue** : skill en anglais, ce blueprint reste en français comme doc interne.

## 9. Maintenance

Le skill contient des numéros de version qui vieilliront. Le SKILL.md impose déjà la
lecture de `package.json` avant toute recommandation, mais à chaque majeure d'Astro il
faudra relire : `references/13-versions-migration.md` (nouvelle section de migration),
`references/02-adapters.md` (les adaptateurs cassent à chaque majeure), et le tableau des
versions du §0 de ce document.
