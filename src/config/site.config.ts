import { defineSite } from './schema';

/**
 * Source of truth #1: identity, legal, features, providers.
 *
 * Not here: editorial content (that lives in src/content/) and secrets
 * (those live in .env, typed through astro:env).
 *
 * Changing `name` and `domain` must remove every trace of the previous site from
 * the rendered output — title, og, footer, schema.org, sitemap.
 */
export const site = defineSite({
  name: 'Nom du site',
  legalName: 'RAISON SOCIALE',
  domain: 'example.com',
  lang: 'fr',
  locale: 'fr_FR',

  // Only implemented adapters appear in these unions (src/config/schema.ts).
  providers: {
    kv: 'memory',
    mail: 'none',
    lead: 'n8n',
    captcha: 'none',
    cms: 'files',
  },

  seo: {
    titleTemplate: '%s | Nom du site',
    defaultTitle: 'Nom du site',
    defaultDescription: 'Description par défaut du site, à remplacer.',
    ogImage: '/og-default.png',
    verification: { google: '', bing: '' },
    noindexPaths: [
      '/merci/',
      '/mentions-legales/',
      '/politique-confidentialite/',
      '/gestion-cookies/',
      '/maitriser-astro/',
    ],
    indexNowKey: '',
  },

  crawlers: {
    allowed: [
      'GPTBot',
      'ClaudeBot',
      'Google-Extended',
      'CCBot',
      'Amazonbot',
      'Applebot-Extended',
      'meta-externalagent',
    ],
    blocked: ['Bytespider'],
    contentSignal: 'search=yes,ai-input=yes,ai-train=no,use=reference',
  },

  brand: {
    themeColor: '#111111',
    favicon: '/favicon.ico',
    logo: '/logo.svg',
  },

  contact: {
    email: '',
    phone: '',
    address: { street: '', postalCode: '', city: '', country: 'FR' },
    bookingUrl: '',
  },

  sameAs: [],

  form: {
    enabled: true,
    fields: [
      { name: 'name', type: 'text', label: 'Votre nom', required: true, min: 2, max: 80, autocomplete: 'name' },
      { name: 'email', type: 'email', label: 'Votre email', required: true, max: 254, autocomplete: 'email' },
      { name: 'phone', type: 'tel', label: 'Téléphone', required: false, max: 32, autocomplete: 'tel' },
      { name: 'message', type: 'textarea', label: 'Votre besoin', required: true, min: 20, max: 2000 },
    ],
    legalBasis: 'precontractual',
    requireAcknowledgement: false,
    privacyNotice:
      'Vos données sont utilisées uniquement pour répondre à votre demande et conservées 3 ans. Vous disposez d\'un droit d\'accès, de rectification et de suppression.',
    marketingOptIn: false,
    autoReply: true,
    minDelayMs: 2000,
    rateLimit: { maxAttempts: 5, windowMs: 10 * 60 * 1000 },
  },

  legal: {
    email: '',
    address: '',
    status: '',
    siren: '',
    vat: '',
    capital: '',
    publisher: '',
    host: { name: '', address: '', url: '' },
  },

  nav: {
    main: [
      { label: 'Blog', href: '/blog/' },
      { label: 'Contact', href: '/contact/' },
    ],
    footer: [
      { label: 'Mentions légales', href: '/mentions-legales/' },
      { label: 'Politique de confidentialité', href: '/politique-confidentialite/' },
      { label: 'Gestion des cookies', href: '/gestion-cookies/' },
    ],
    cta: { label: 'Nous contacter', href: '/contact/' },
  },

  blog: { postsPerPage: 12 },

  features: { analytics: false, darkMode: false, booking: false },
});
