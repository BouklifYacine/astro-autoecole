# Portabilité

Environ 90 % du code est Astro standard : pages statiques, layouts, SEO, collections, composants, tests et design tokens.

## Ports

| Port | Interface | Implémentation P0 |
| --- | --- | --- |
| Clé-valeur | `KVStore` | Cloudflare KV, Upstash REST |
| Mail | `MailProvider` | Resend HTTP |
| Destination de lead | `LeadDestination` | n8n HTTP signé |
| Captcha | `CaptchaProvider` | Turnstile HTTP |

Les unions de fournisseurs contiennent uniquement des implémentations réelles. Ajouter un fournisseur demande son adaptateur, ses tests et son membre d’union dans le même changement.

## Changer d’hébergeur

1. Remplacer l’adaptateur Astro dans `astro.config.mjs`.
2. Remplacer l’accès runtime dans `src/pages/api/leads.ts` par l’équivalent du nouvel hébergeur.
3. Conserver les interfaces de `src/lib/adapters/types.ts`.
4. Réécrire `wrangler.jsonc`, les workflows et les headers selon l’hébergeur.

Turnstile, Resend, n8n et Upstash sont des services HTTP : ils ne verrouillent pas l’hébergement.
