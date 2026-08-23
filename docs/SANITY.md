# Sanity — le cours

> À lire une fois. Objectif : que tu saches ce qui est branché, pourquoi, et
> comment ajouter la suite tout seul.

---

## 1. L'idée en une phrase

**Sanity est une base de données de contenu + une interface d'édition.**

Ce n'est pas WordPress. Il n'y a pas de « thème », pas de pages, pas de plugins
qui rendent du HTML. Sanity stocke du **contenu structuré** (des champs typés) et
te le renvoie en JSON. C'est toi qui décides comment l'afficher.

Conséquence directe : le même contenu peut alimenter le site, une app mobile et
un export PDF sans être réécrit. C'est ce qu'ils appellent le *Content Lake*.

---

## 2. Les deux moitiés, et pourquoi elles sont séparées

| | Où ça tourne | À quoi ça sert |
|---|---|---|
| **Le Studio** | chez toi, ou sur `*.sanity.studio` | l'interface où le client tape son texte |
| **Le Content Lake** | chez Sanity | la base qui stocke et sert le contenu |

Le Studio n'est qu'un client de la base. Tu peux le supprimer, le contenu reste.
Tu peux en avoir plusieurs. C'est une app React que **tu configures**, pas un
back-office figé.

---

## 3. Ce qui est branché dans ce projet

Quatre fichiers. C'est tout.

```
sanity.config.ts              ← config du Studio (nom, projet, schémas)
sanity/schemaTypes/avis.ts    ← la définition d'UN type de contenu
astro.config.ts               ← l'intégration qui fournit `sanity:client`
src/lib/adapters/cms/sanity.ts ← la requête GROQ + la validation
```

### Le flux, du clic au visiteur

```
Le client écrit dans le Studio
        ↓
   Content Lake (chez Sanity)
        ↓  ← lu UNE FOIS, pendant `bun run build`
   src/lib/adapters/cms/sanity.ts   (requête GROQ)
        ↓  ← validé par le même schéma Zod que le JSON
   Avis.astro
        ↓
   HTML statique servi au visiteur
```

**Le point important : Sanity n'est jamais appelé quand un visiteur charge la
page.** Le site reste 100 % statique. Le client publie → un rebuild se déclenche
→ le nouveau contenu est en ligne une minute plus tard.

C'est un choix, pas une limite. Ça veut dire : zéro latence, zéro coût d'API par
visiteur, et le site reste debout même si Sanity tombe.

### Le repli

```ts
const fromSanity = await getAvisFromSanity();
const items = fromSanity ?? avis.items;   // ← sinon, le fichier JSON
```

Sans `PUBLIC_SANITY_PROJECT_ID` dans `.env`, aucune requête n'est envoyée et le
site utilise `src/content/autoecole.json`. Un clone frais build sans compte
Sanity — c'est la règle n°2 du boilerplate, elle est respectée.

---

## 4. Le branchement, en 5 commandes

```bash
bunx sanity login          # ouvre le navigateur, crée/connecte ton compte
bunx sanity init           # crée le projet, te donne le projectId
```

Puis dans `.env` :

```
PUBLIC_SANITY_PROJECT_ID=xxxxxxxx
PUBLIC_SANITY_DATASET=production
```

Puis :

```bash
bun run studio             # le Studio sur http://localhost:3333
bun run dev                # le site sur http://localhost:4321
bun run build              # relit Sanity et regénère le HTML
```

Deux terminaux, deux ports. Le Studio ne fait pas partie du site.

> **Pourquoi pas `/admin` sur le site ?** J'ai essayé : `@sanity/astro` sait
> embarquer le Studio sur une route, mais le paquet `sanity` ne se charge pas
> sous le bundler d'Astro 7 (Vite 8 / rolldown). Erreurs `MISSING_EXPORT` en
> cascade. Le Studio autonome est de toute façon meilleur ici : le paquet
> `sanity` fait ~600 Mo, tu ne veux pas ça dans le build de 20 sites clients.

Pour le mettre en ligne gratuitement : `bun run studio:deploy` →
`ton-projet.sanity.studio`. Le client s'y connecte avec son email, sans compte
GitHub, sans rien installer.

---

## 5. Les 3 concepts à connaître

### Le schéma (`defineType` / `defineField`)

C'est toi qui décides quels champs existent. Le Studio construit son formulaire
à partir de ça. Regarde `sanity/schemaTypes/avis.ts` : chaque `defineField` est
une ligne dans le formulaire.

La validation vit sur le champ :

```ts
validation: (rule) => rule.required().min(40).max(400)
```

Le Studio empêche la publication si ce n'est pas respecté. C'est ton garde-fou
contre un client qui colle trois mots dans un témoignage.

### GROQ (le langage de requête)

Comme SQL, mais pour du JSON. Deux règles :

```groq
*[_type == "avis"]                    // tous les documents de type "avis"
*[_type == "avis"] | order(ordre asc) // triés
*[_type == "avis"]{ prenom, comment } // ← la PROJECTION : seulement ces champs
```

**Demande toujours les champs explicitement.** `*[_type == "avis"]` sans
accolades renvoie tout le document, métadonnées comprises. C'est la règle n°1
des bonnes pratiques Sanity côté performance.

Il y a un terrain de jeu pour s'entraîner : <https://groq.dev>

### Les références

Si demain les avis doivent pointer vers un moniteur, tu ne recopies pas le
moniteur dans l'avis. Tu mets une **référence** :

```ts
defineField({ name: 'moniteur', type: 'reference', to: [{ type: 'moniteur' }] })
```

et tu la résous en GROQ avec `->` :

```groq
*[_type == "avis"]{ prenom, comment, moniteur->{ prenom, secteur } }
```

C'est la différence entre un CMS structuré et un CMS « page ». Un moniteur
existe une fois, il est référencé partout.

---

## 6. Ajouter un type de contenu — la boucle à répéter

Aujourd'hui seuls les **avis** viennent de Sanity. Les formations, tarifs,
moniteurs, FAQ sont encore dans le JSON. Pour en migrer un :

1. **Le schéma** → `sanity/schemaTypes/formation.ts`, sur le modèle de `avis.ts`
2. **L'enregistrer** → une ligne dans `sanity/schemaTypes/index.ts`
3. **La requête** → une constante `defineQuery` dans `src/lib/adapters/cms/sanity.ts`
4. **Le repli** → `const items = fromSanity ?? autoecole.formations`

Quatre étapes, toujours les mêmes. Le schéma Zod de `src/content/schemas.ts` ne
bouge pas : **c'est lui le contrat**, Sanity doit s'y conformer. Si le CMS
renvoie un champ manquant, le build échoue avec le chemin exact du champ — pas
une page à trou en production.

---

## 6 bis. Ce que tu peux modéliser — la liste des champs

Il n'y a pas de « types de contenu » prédéfinis dans Sanity. Tu assembles des
champs. Voici tout ce qui existe :

**Champs simples** — `string`, `text` (multi-lignes), `number`, `boolean`,
`date`, `datetime`, `url`, `email`, `slug` (l'URL, avec génération auto depuis
le titre).

**Champs riches** — `image`, `file`, `array` (liste de n'importe quoi),
`object` (groupe de champs), `reference` (pointeur vers un autre document),
`geopoint` (coordonnées GPS), `blockContent` (texte riche = Portable Text).

**Ce que tu ajoutes par-dessus :**

| Besoin | Comment |
|---|---|
| Liste déroulante | `options: { list: [...] }` |
| Boutons radio | `options: { layout: 'radio' }` |
| Champ conditionnel | `hidden: ({ parent }) => parent?.type !== 'x'` |
| Validation | `validation: (rule) => rule.required().min(40)` |
| Avertissement non bloquant | `.warning('Trop long pour le SEO')` |
| Unicité vérifiée en base | `.custom(async (v, ctx) => ...)` |
| Icône dans le menu | `icon: DocumentTextIcon` |

**La règle de modélisation qui compte** (source : bonnes pratiques Sanity) :
> Modélise **ce que les choses sont**, pas **à quoi elles ressemblent**.

`titreGrosRouge` ❌ · `accroche` ✅
`blocTroisColonnes` ❌ · `formations` ✅

Le test : « si je refais le design dans deux ans, ce nom a-t-il encore du
sens ? »

---

## 6 ter. Les images — le point fort

C'est là que Sanity écrase un dossier de fichiers.

### Le hotspot

Le client dépose une photo et **dessine un cercle sur ce qui compte** (un
visage, un véhicule). Ensuite, quel que soit le format demandé — carré pour une
vignette, 16/9 pour une bannière, 3/4 pour une carte — le recadrage garde
toujours ce point au centre.

```ts
defineField({
  name: 'photo',
  type: 'image',
  options: { hotspot: true },   // ← à ne JAMAIS oublier
  fields: [
    defineField({ name: 'alt', type: 'string',
      validation: (r) => r.required().warning('Important pour le SEO') }),
  ],
})
```

> **C'est exactement le problème qu'on a réglé à la main ce matin.** Les quatre
> portraits de moniteurs avaient le visage à une hauteur différente dans chaque
> fichier ; j'ai dû les recadrer avec `sharp` en calculant les coordonnées. Avec
> le hotspot, le client le fait lui-même en deux secondes, et ça marche pour
> tous les formats à venir.

### Les transformations par URL

Une fois la photo dans Sanity, tu demandes n'importe quelle variante en
changeant l'URL. Pas de retraitement, pas de fichier à régénérer :

```ts
urlFor(photo).width(800).height(600).fit('crop').url()
```

`fit('crop')` respecte automatiquement le hotspot. Le CDN sert du WebP ou de
l'AVIF selon le navigateur, sans que tu le demandes.

### Le flou de chargement (LQIP)

Sanity calcule une micro-version floue de chaque image, encodée en base64.
Elle s'affiche pendant le chargement, ce qui évite le trou blanc.

⚠️ **Elle n'est pas renvoyée par défaut**, il faut la demander en GROQ :

```groq
photo {
  asset->{ url, metadata { lqip, dimensions { width, height } } },
  alt, hotspot, crop
}
```

---

## 6 quater. Les trois niveaux de liberté du client

| Niveau | Ce que le client peut faire | Ton coût | Risque |
|---|---|---|---|
| **1. Champs** | changer les textes, prix, photos | faible | aucun |
| **2. Collections** | créer une formation → une page apparaît | +30 lignes | faible |
| **3. Page builder** | composer ses pages en empilant des blocs | ×3–4 | il casse le design |

**Niveau 2**, concrètement : tu ajoutes un champ `slug` au type, tu crées
`src/pages/formations/[slug].astro`, et `getStaticPaths()` liste les documents
Sanity. Le client publie « Permis moto » → `/formations/permis-moto/` existe au
prochain build.

**Niveau 3** : le document contient un `array` de blocs, et chaque bloc est un
`object` avec ses champs. Tu écris un composant Astro par bloc. C'est ce que
fait un vrai CMS moderne — et c'est ce qui coûte cher.

⚠️ Sur un site vitrine, le niveau 3 est presque toujours du gaspillage. Le
client change ses tarifs deux fois par an ; il ne réinvente pas sa page
d'accueil. Tu construirais un éditeur de pages pour quelqu'un qui voulait
modifier « 1 190 € ».

---

## 7. Ce que Sanity sait faire (et qu'on n'utilise pas encore)

| Fonctionnalité | Ce que ça t'apporte | Doc |
|---|---|---|
| **Images** | upload, recadrage par point focal, redimensionnement à la volée par URL | [Images](https://www.sanity.io/docs/image-urls) |
| **Portable Text** | du texte riche structuré (pas du HTML), rendu comme tu veux | [Portable Text](https://www.sanity.io/docs/presenting-block-text) |
| **TypeGen** | génère les types TS depuis ton schéma → autocomplétion sur les résultats GROQ | [TypeGen](https://www.sanity.io/docs/sanity-typegen) |
| **Visual Editing** | le client clique sur un texte du site et atterrit sur le bon champ | [Visual Editing](https://www.sanity.io/docs/introduction-to-visual-editing) |
| **Webhooks** | « à chaque publication, déclenche un rebuild Cloudflare » | [Webhooks](https://www.sanity.io/docs/webhooks) |
| **Structure** | organiser le menu du Studio (singletons, dossiers, filtres) | [Structure](https://www.sanity.io/docs/structure-builder-introduction) |
| **Releases** | préparer un lot de changements et tout publier à une date | [Releases](https://www.sanity.io/docs/releases) |

Le plus utile pour ce projet, dans l'ordre : **webhook de rebuild**, puis
**images**, puis **TypeGen**.

---

## 8. Les limites, pour ne pas les découvrir en prod

- **Le contenu sort de ton dépôt.** Git ne le versionne plus. Prévois un export
  (`sanity dataset export`) dans ta checklist de livraison client.
- **Le plan gratuit est large** (voir §10). La vraie limite n'est pas le volume,
  ce sont les **rôles** : seulement Administrateur et Lecteur. Pas de rôle
  « Éditeur » — donc un client à qui tu donnes accès peut aussi supprimer un
  type de contenu. Et les datasets sont **publics** : n'y mets jamais de donnée
  personnelle.
- **Le client ne voit pas son changement tout de suite.** Il publie, le rebuild
  prend ~1 minute. Dis-le lui, sinon il republie cinq fois.
- **Le schéma est écrit deux fois** : en Zod (`src/content/schemas.ts`) et en
  Sanity (`sanity/schemaTypes/`). TypeGen réduit l'écart mais ne le supprime pas.
  C'est le vrai coût de l'intégration.

---

## 10. Le plan gratuit, en chiffres

| | Gratuit | Ce que ça veut dire pour un site vitrine |
|---|---|---|
| Utilisateurs | **20** | largement assez |
| Documents | **10 000** | un site vitrine en utilise ~50 |
| Requêtes API | **250 k/mois** | on en fait ~10 par build |
| Requêtes CDN | 1 M/mois | non utilisées (lecture au build) |
| Bande passante | 100 Go/mois | |
| Stockage fichiers | 100 Go | des centaines de photos |
| Datasets | **2, publics uniquement** | ⚠️ pas de donnée personnelle dedans |
| Rôles | **2** (Admin, Lecteur) | ⚠️ pas de rôle « Éditeur » |
| Webhooks | 2 | assez pour le rebuild |

**Le volume ne sera jamais le problème.** Les deux vraies contraintes sont les
rôles (un client admin peut tout casser) et le dataset public.

Le plan payant (Growth) est à 15 $/utilisateur/mois : il débloque les datasets
privés, les rôles fins (Éditeur, Contributeur) et les commentaires. Tu n'en as
pas besoin pour une vitrine.

### Ce qui n'est PAS limité sur le plan gratuit

Beaucoup de gens croient que le gratuit est bridé sur les fonctionnalités. Non —
il est bridé sur le **volume** et les **rôles**. Tout ceci fonctionne :

- schémas illimités, champs illimités, imbrication illimitée ;
- hotspot, recadrage, transformations d'images, LQIP, CDN ;
- Portable Text (texte riche) ;
- références entre documents, tableaux, objets, champs conditionnels ;
- toute la validation, y compris asynchrone ;
- brouillons et publication ;
- Structure personnalisée du Studio, singletons, icônes ;
- GROQ complet, requêtes temps réel ;
- Studio hébergé sur `*.sanity.studio` ;
- TypeGen, CLI, import/export de dataset ;
- Visual Editing.

### Les vraies limites, dans l'ordre où elles vont te gêner

1. **Deux rôles seulement.** Admin ou Lecteur. Ton client sera admin — il peut
   donc supprimer des documents. Pas de « il peut éditer mais pas supprimer ».
2. **Datasets publics.** Le contenu est lisible par qui connaît le `projectId`.
   Jamais de donnée personnelle : les leads passent par n8n, pas par Sanity.
3. **2 webhooks.** Un pour le rebuild de production, un pour la préprod. Après,
   il faut payer.
4. **2 datasets.** En pratique `production` + `staging`. Suffisant.
5. **Pas de commentaires ni de tâches** entre éditeurs. Sans importance à un
   seul éditeur.

---

## 11. Où lire la suite

| Sujet | Lien |
|---|---|
| Documentation générale | <https://www.sanity.io/docs> |
| Intégration Astro | <https://www.sanity.io/plugins/sanity-astro> |
| Référence GROQ | <https://www.sanity.io/docs/groq> |
| Types de schéma | <https://www.sanity.io/docs/schema-types> |
| Bonnes pratiques agents | <https://github.com/sanity-io/agent-toolkit> |

Les skills officiels Sanity sont installés dans `.agents/skills/` — sept
guides, dont `references/astro.md` et `references/groq.md`. C'est la source la
plus à jour, plus fiable que ma mémoire.
