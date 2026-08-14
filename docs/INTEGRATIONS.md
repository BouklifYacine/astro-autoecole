# Intégrations

## Cloudflare

L’adaptateur Cloudflare sert les pages statiques et la route API on-demand. Les bindings sont exposés par `cloudflare:workers`.

```bash
bun run setup:cloudflare
```

## Formulaire

Le formulaire exige en production : Turnstile, n8n et un secret de signature. Le mail Resend est facultatif pour la livraison du lead mais nécessaire pour les accusés et notifications.

## Upstash

Si `site.providers.kv` vaut `upstash`, fournir `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`. L’adaptateur utilise le protocole REST, sans SDK fournisseur dans le code métier.

## Analytics

Les identifiants publics sont inlinés au build et les scripts ne sont chargés qu’après acceptation. `features.analytics: false` produit zéro script analytics.
