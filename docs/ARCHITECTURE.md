# Architecture — comment ce projet est fait et comment s'en servir

> À lire une fois, puis à garder sous la main. Tu n'as pas besoin de comprendre
> les 3 500 lignes : au quotidien tu en touches ~200.

---

## 1. L'idée en une phrase

**Trois dépôts de vérité, et rien ailleurs.**

| Où | Quoi | Exemple |
|---|---|---|
| `src/config/site.config.ts` | identité, juridique, fournisseurs, champs du formulaire | nom du site, SIREN, `providers.kv` |
| `src/content/` | contenu éditorial | articles de blog, textes des pages légales |
| `.env` | secrets et valeurs d'environnement | clé Resend, URL du webhook |

Si tu écris un nom de client, un SIREN ou une clé **ailleurs** que dans ces trois
endroits, un test échoue (invariant I1). C'est volontaire : c'est ce qui fait qu'un
nouveau projet démarre en changeant un fichier au lieu de faire un chercher/remplacer.

---

## 2. Les trois zones du code

### 🟢 Zone 1 — tu touches ça tous les jours (~200 lignes)

```
src/config/site.config.ts     ← le fichier n°1. Tout part de là.
src/pages/*.astro             ← une page = un fichier
src/content/blog/*.md         ← tes articles
src/styles/global.css         ← les 6 variables de marque
```

### 🟡 Zone 2 — tu touches ça au démarrage d'un projet, puis plus

```
wrangler.jsonc                ← nom du worker, KV, domaine
.env                          ← les clés
src/content/site.json         ← textes des pages légales
scripts/setup-*.mjs           ← provisioning (tu les lances, tu ne les édites pas)
```

### 🔴 Zone 3 — tu ne touches jamais (≈ 1 700 lignes)

```
src/lib/leads/                ← pipeline du formulaire (sécurité)
src/lib/adapters/             ← les 4 interfaces fournisseurs
src/lib/seo.ts, schema-org.ts ← génération des métadonnées
src/layouts/                  ← la coquille HTML
tests/                        ← les garde-fous
```

C'est du code écrit une fois, couvert par 18 tests. **Si tu as besoin de le modifier,
c'est probablement que quelque chose manque dans `site.config.ts`.**

---

## 3. Comment ça s'enchaîne (le flux d'une page)

```
site.config.ts ─┐
                ├─► buildSeo({ path }) ─► ResolvedSeo ─┐
lib/schema-org ─┘                                       ├─► <Seo /> ─► <head>
                                                        │
page.astro ─────► PageLayout seo={seo} schema={schema} ─► BaseLayout
                                                               ├─► <Seo /> ─► <head>
                                                               └─► <main id="main"> ← TON contenu
```

**Le contrat unique à retenir** : une page construit un objet `seo` avec `buildSeo`,
et le passe au layout. Le layout s'occupe du reste (title, canonical, OG, JSON-LD).
Tu n'écris jamais une balise `<meta>` à la main.

Et le flux du formulaire :

```
ContactForm.tsx  ──POST──►  /api/leads
   (rendu depuis            │
    site.config.form)       ├─ 1. origine autorisée ?
                            ├─ 2. taille du corps ok ?
                            ├─ 3. champs valides ? (schéma dérivé de la config)
                            ├─ 4. honeypot vide ?
                            ├─ 5. délai humain respecté ?
                            ├─ 6. rate limit           ─┐
                            ├─ 7. pas un doublon ?      ├─► KVStore
                            ├─ 8. captcha vérifié ?     ─┘
                            ├─ 9. livraison ──► LeadDestination (n8n ou mail)
                            └─ 10. accusé de réception ──► MailProvider
```

Chaque étape est isolée dans son fichier. **L'ordre n'est pas arbitraire** : le moins
cher et le plus décisif d'abord, pour ne jamais brûler un appel captcha sur un bot
évident.

---

## 4. Ce que tu fais au quotidien

### Ajouter une page

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
import { buildSeo } from '../lib/seo';

const seo = buildSeo({
  title: 'Mes services',
  description: 'Une description entre 70 et 160 caractères.',
  path: '/services/',
});
---

<PageLayout seo={seo}>
  <section class="container-shell section-space">
    <h1>Mes services</h1>
  </section>
</PageLayout>
```

C'est tout. La page est statique, indexable, avec canonical et JSON-LD corrects.

**Piège** : `path` doit finir par `/`. Le projet est en `trailingSlash: 'always'`.

### Ajouter un composant

Trois questions, dans l'ordre :

1. **C'est du contenu statique ?** → fichier `.astro`, zéro JavaScript. C'est 90 % des cas.
2. **Il faut une petite interaction ?** (menu, accordéon) → `.astro` + une balise `<script>`.
3. **Il y a un vrai état React ?** → `.tsx` + `client:visible`.

Ne mets `client:load` nulle part sur un site vitrine. Si tu hésites, c'est `.astro`.

### Ajouter un article

Crée `src/content/blog/mon-article.md` :

```markdown
---
title: "Un titre entre 15 et 60 caractères"
description: "Une description entre 70 et 160 caractères, exactement."
publishedAt: 2026-08-12
draft: false
---

Le contenu.
```

Les bornes SEO sont dans le schéma Zod : un titre trop long **fait échouer le build**.
C'est voulu — c'est un garde-fou anti-contenu-mince gratuit.

### Changer les champs du formulaire

Un seul endroit : `site.config.ts` → `form.fields`. Le schéma de validation **et** le
rendu HTML en découlent. Tu ne touches ni `validation.ts` ni `ContactForm.tsx`.

```ts
{ name: 'budget', type: 'select', label: 'Budget', required: true,
  options: ['< 2k', '2-5k', '> 5k'] }
```

### Changer l'identité visuelle

`src/styles/global.css`, bloc `@theme`, six variables. Rien d'autre.

---

## 5. Démarrer un nouveau projet client

```bash
gh repo create mon-client --template BouklifYacine/astro-boilerplate --private --clone
cd mon-client && bun install
bun run init          # pose les questions, réécrit la config, supprime les modules non retenus
```

Puis, dans l'ordre :

1. Compléter `site.config.ts` — légal, contact, nav, champs du formulaire
2. `bun run setup:cloudflare` — crée le KV, écrit l'id dans `wrangler.jsonc`
3. Créer le widget Turnstile + la clé Resend, remplir `.env`
4. **DNS mail : SPF + DKIM + DMARC** — ~30 min incompressibles, sinon tout part en spam
5. `bun run setup:github` — pousse les variables et secrets
6. Remplacer `og-default.png`, favicon, logo
7. Écrire le contenu
8. `git push` → déploiement automatique

⚠️ **Ne clone pas dans un dossier profond.** Au-delà de ~120 caractères de chemin, le KV
local de miniflare casse sur Windows avec un message qui n'oriente pas du tout
(`Network connection lost`). `C:\dev\mon-client` plutôt que
`C:\Users\...\OneDrive\Documents\Projets\Clients\2026\mon-client`.

---

## 6. Les commandes

```bash
bun run dev              # développement
bun run build            # LE vrai test — attrape les erreurs d'adaptateur et de contenu
bun run preview          # obligatoire pour tester cache, headers, redirections
bun run check            # types + diagnostics de templates
bun run test             # les 18 garde-fous
bun run verify           # vérifie le build produit (titres/descriptions uniques)
```

**Ne valide jamais un comportement de cache, de header ou de redirection avec `dev`.**
Le cache est désactivé en dev et le serveur de dev ne reproduit pas l'edge. `build`
puis `preview`.

---

## 7. Les garde-fous (et pourquoi ils existent)

`bun run test` fait échouer la CI si :

| # | Règle | Pourquoi |
|---|---|---|
| I1 | Aucune valeur client hors des 3 dépôts | sinon un projet fuit dans le suivant |
| I2 | Aucune route en `prerender = false` hors `/api/` | une page en SSR par distraction perd le cache CDN |
| I3 | Aucune `<img>` brute | passe à côté de l'optimisation et du LCP |
| I7 | Titres et descriptions uniques | duplicate content |
| I8 | Un vrai document 404 | une soft-404 pollue l'index |
| I13 | Aucun SDK fournisseur hors de `lib/adapters/` | sinon changer de fournisseur = tout réécrire |

Si un test te bloque, **lis-le avant de le contourner** : chacun encode une erreur qui
coûte cher en production.

---

## 8. Sur quoi te concentrer

Voilà l'avis franc.

**Ce boilerplate n'est pas ton produit.** C'est un outil qui transforme une semaine de
travail en une journée. Sa valeur est déjà capturée : le pipeline formulaire sécurisé,
le SEO automatique, la portabilité d'hébergeur, les garde-fous. **Il est fini pour ce
qu'il doit faire.**

### Là où va ton temps maintenant

1. **Tes composants marketing.** C'est le seul poste qui n'est pas générique, et c'est
   celui qui décide si un site ressemble à un vrai site de plombier ou à une démo
   d'agence tech. Vise 8–10 blocs réutilisables : hero, preuve sociale, offre, process,
   FAQ, CTA. Le critère : **produire un site de plombier crédible en changeant
   uniquement les 6 variables CSS et le contenu.**

2. **Le premier vrai projet client, en entier.** Il t'apprendra plus sur ce qui manque
   que trois jours passés à améliorer le boilerplate. C'est aussi lui qui te donnera les
   vrais chiffres — combien de temps prend réellement un site.

3. **Le contenu et l'offre.** Un site vitrine techniquement parfait sans contenu ne
   vend rien.

### Là où ton temps se perdrait

- Ajouter des adaptateurs « au cas où » (un CMS, un autre mail). L'interface existe :
  tu l'implémenteras quand un client le demandera, en une journée.
- Ajouter des invariants. Il y en a 6, le plan en prévoyait 11 — les 5 autres attendent
  de mordre pour de vrai.
- Ajouter des fonctionnalités au boilerplate. Chaque option est du code à maintenir sur
  20 sites.

### Le signal que tu es sur la bonne voie

Ton deuxième site client doit être **plus rapide** que le premier, et le troisième plus
rapide que le deuxième. Si ce n'est pas le cas, le problème n'est pas dans le code — il
est dans le processus (contenu, allers-retours client, DNS), et c'est là qu'il faut
regarder.

---

## 9. Où lire la suite

| Fichier | Contenu |
|---|---|
| `docs/CONTRACTS.md` | les invariants en détail |
| `docs/PORTABILITE.md` | changer d'hébergeur, ajouter un adaptateur |
| `docs/CHECKLIST-NOUVEAU-PROJET.md` | la séquence de démarrage |
| `docs/CHANGELOG.md` | reporter une correction dans un projet client existant |
| `.agents/skills/astro/` | le skill Astro — routing, adaptateurs, pièges de version |
