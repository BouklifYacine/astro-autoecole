import { defineConfig, envField } from 'astro/config';
import { loadEnv } from 'vite';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { site } from './src/config/site.config';

// astro:env is not usable inside this file — read the build-time origin directly.
const { SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const origin = SITE_URL || `https://${site.domain}`;

export default defineConfig({
  site: origin,

  // I2 — static is the safe default: a page added by mistake stays static.
  // Only /api/leads carries `export const prerender = false`.
  output: 'static',

  // The adapter is required even under `static`, because of that one API route.
  // Compile-time images avoid provisioning an IMAGES binding; Node prerendering
  // keeps the static build independent from workerd while the API stays on the
  // Cloudflare runtime at deployment time.
  session: false,
  adapter: cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' }),

  // One canonical URL shape. Without this, /page and /page/ both resolve and the
  // canonical tags end up disagreeing with the internal links.
  trailingSlash: 'always',

  build: { inlineStylesheets: 'auto' },

  // Every variable is optional so a fresh clone builds with no .env at all (rule 2).
  // The lead pipeline reports a precise error at runtime when a provider is missing.
  env: {
    schema: {
      SITE_URL: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GA4_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_POSTHOG_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_POSTHOG_HOST: envField.string({
        context: 'client',
        access: 'public',
        default: 'https://eu.i.posthog.com',
      }),

      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEAD_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEAD_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      CAL_BOOKING_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),

      MAIL_FROM: envField.string({ context: 'server', access: 'public', optional: true }),
      MAIL_NOTIFY_TO: envField.string({ context: 'server', access: 'public', optional: true }),
    },
    validateSecrets: false,
  },

  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !site.seo.noindexPaths.some((path) => new URL(page).pathname === path),
      // No `serialize` on purpose: there is no honest site-wide lastmod. Stamping
      // the build date on every URL tells Google the whole site changed on every
      // deploy, and it learns to ignore the signal. Absent beats wrong.
    }),
  ],

  vite: {
    resolve: { dedupe: ['react', 'react-dom'] },
    // Without this list the dev pre-bundler serves React and the @astrojs/react
    // renderer under two different module identities: hooks return null, islands
    // crash on hydration, and CTA buttons vanish after painting. Optimizing them
    // together fixes it. No effect on the production build, which does not use the
    // pre-bundler. Do not delete because it "looks like noise".
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    },
    // @tailwindcss/vite and Astro can resolve separate Vite type graphs when
    // their minor versions differ. Runtime behavior is compatible; this cast is
    // limited to the Vite plugin boundary.
    plugins: [tailwindcss() as any],
  },
} as any);
