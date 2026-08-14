# Checklist nouveau projet

1. Créer le dépôt depuis le Template GitHub.
2. Exécuter `bun install`, puis `bun run init`.
3. Compléter `src/config/site.config.ts` : identité, mentions, navigation, formulaire et fournisseurs.
4. Remplacer `src/content/blog/placeholder.md` par les contenus réels ou le supprimer.
5. Provisionner les namespaces avec `bun run setup:cloudflare`.
6. Créer le widget Turnstile et renseigner les secrets du webhook et du mail.
7. Configurer SPF, DKIM et DMARC sur le domaine mail.
8. Vérifier `bun run check`, `bun run test`, `bun run build`.
9. Remplacer le favicon et le visuel OG génériques.
10. Ajouter la route et le DNS du domaine personnalisé.
11. Configurer les variables et secrets GitHub avec `bun run setup:github`.
12. Déployer, tester le formulaire et vérifier le sitemap.
