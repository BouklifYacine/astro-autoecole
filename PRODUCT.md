# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Le produit principal est un starter Astro réutilisable par un développeur web francophone qui construit des sites vitrines et des landing pages de production pour des TPE/PME. Il sert aussi de support concret pour maîtriser Astro en profondeur, sans séparer l'apprentissage des contraintes réelles de livraison.

## Product Purpose

Fournir une base Astro statique-first, fiable et portable, qui accélère le démarrage d'un nouveau projet tout en rendant explicites les décisions importantes de rendu, de contenu, de performance, de sécurité et de déploiement.

Le succès signifie qu'un nouveau projet peut partir de cette base, rester rapide par défaut, n'activer du rendu à la demande ou du JavaScript client que lorsqu'un besoin le justifie, puis être vérifié et déployé sans connaissance cachée.

## Positioning

Le starter ne se limite pas à assembler des composants visuels. Il encode des garde-fous de production et montre pourquoi ils existent : statique par défaut, îlots interactifs ciblés, contenu validé, contrats d'intégration explicites et vérifications reproductibles.

## Operating Context

- Développement local sous Windows avec Bun et les commandes Astro.
- Réutilisation du dépôt pour plusieurs projets clients.
- Déploiement principal sur Cloudflare, avec une architecture qui garde les dépendances au runtime derrière des adaptateurs internes.
- React réservé aux îlots qui exigent une interaction navigateur.
- Documentation interne consultée pendant l'apprentissage, l'initialisation d'un projet et la revue avant déploiement.

## Capabilities and Constraints

- Astro 7.2.x, TypeScript strict, Tailwind CSS 4, React 19 et adaptateur Cloudflare.
- Sortie `static` par défaut ; seules les routes qui ont besoin du contexte de requête doivent désactiver le prérendu.
- Content Layer avec schémas pour les contenus structurés.
- Pipeline de formulaire extensible par adaptateurs, avec validation et secrets côté serveur.
- Le starter doit fonctionner sans fichier `.env` lors d'un premier clone.
- Toute page pédagogique incluse au starter est un outil interne et ne doit pas être indexée comme une page commerciale d'un projet client.
- Aucune preuve commerciale, donnée client ou performance non mesurée ne doit être inventée.

## Evidence on Hand

- Configuration de production : `astro.config.ts`.
- Contrats et limites d'intégration : `docs/CONTRACTS.md` et `docs/INTEGRATIONS.md`.
- Procédure de nouveau projet : `docs/CHECKLIST-NOUVEAU-PROJET.md`.
- Tests d'invariants et du pipeline de leads : `tests/invariants.test.ts` et `tests/leads.test.ts`.
- Implémentations concrètes du routage, du contenu, du SEO, des images, des îlots React et d'une route API dans `src/`.

## Product Principles

1. Le HTML statique est la base ; chaque coût dynamique doit être justifié.
2. Le starter doit enseigner ses décisions par des exemples exécutables, pas par des conventions implicites.
3. Les frontières entre build, serveur, navigateur et plateforme de déploiement doivent rester visibles.
4. Les données, entrées et contenus structurés sont typés et validés avant usage.
5. Une modification n'est terminée qu'après les contrôles adaptés à son risque.

## Accessibility & Inclusion

Les interfaces doivent rester utilisables au clavier, respecter la réduction des animations, conserver des contrastes lisibles et fonctionner sur mobile sans défilement horizontal.
