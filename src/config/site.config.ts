import { defineSite } from './schema';

/**
 * The one list of formations the forms accept.
 *
 * `/api/leads` validates a `select` against exactly these strings
 * (src/lib/forms/schema.ts), so the contact form, the booking wizard and the
 * formation cards must all speak the same values. src/lib/autoecole.ts asserts
 * at build time that every formation in the content file is one of these.
 */
export const FORMATION_OPTIONS = [
  'Permis B — boîte manuelle',
  'Permis B — boîte automatique',
  'Conduite accompagnée (AAC)',
  'Conduite supervisée',
  'Code de la route',
  'Reprise de conduite',
] as const;

/**
 * Source of truth #1: identity, legal, features, providers.
 *
 * Not here: editorial content (that lives in src/content/) and secrets
 * (those live in .env, typed through astro:env).
 *
 * Changing `name` and `domain` must remove every trace of the previous site from
 * the rendered output — title, og, footer, schema.org, sitemap.
 */
/**
 * ⚠️ CONTENU DE DÉMONSTRATION — auto-école fictive.
 *
 * Ce site est une vitrine commerciale, pas un site client. L'identité ci-dessous
 * est inventée et doit être remplacée en bloc pour un vrai projet. Le téléphone
 * se termine par des zéros pour qu'il ne puisse appartenir à personne.
 *
 * Volontairement NON inventés, parce qu'ils engagent juridiquement :
 *   - le taux de réussite (donnée publiée par l'État, voir autoecole.json)
 *   - le numéro d'agrément préfectoral
 *   - le bloc `legal` ci-dessous, qui reste vide
 */
export const site = defineSite({
  name: 'Auto-école Trajectoire',
  legalName: 'Auto-école Trajectoire',
  domain: 'autoecole-trajectoire.fr',
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
    titleTemplate: '%s | Auto-école Trajectoire',
    defaultTitle: 'Auto-école à Angers — permis B, boîte auto et conduite accompagnée',
    defaultDescription:
      'Auto-école à Angers : permis B manuelle ou automatique, conduite accompagnée et code. Points de rendez-vous à Angers, Avrillé, Trélazé et Les Ponts-de-Cé.',
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
    themeColor: '#F8F9FA',
    favicon: '/favicon.ico',
    logo: '/logo.svg',
  },

  contact: {
    email: 'contact@autoecole-trajectoire.fr',
    phone: '02 41 00 00 00',
    address: { street: '18 rue Saint-Léonard', postalCode: '49100', city: 'Angers', country: 'FR' },
    // Vide : aucun outil de réservation n'est branché. Renseigner cette URL fait
    // pointer le CTA principal vers l'outil réel au lieu du parcours interne.
    bookingUrl: '',
  },

  sameAs: [],

  form: {
    enabled: true,
    // Ces champs pilotent À LA FOIS le rendu du formulaire, la validation client
    // et la validation serveur. Le parcours de réservation compose ses choix
    // dans ces mêmes champs : `/api/leads` refuse toute clé supplémentaire.
    fields: [
      { name: 'name', type: 'text', label: 'Votre nom', required: true, min: 2, max: 80, autocomplete: 'name' },
      { name: 'email', type: 'email', label: 'Votre email', required: true, max: 254, autocomplete: 'email' },
      // Obligatoire : une auto-école confirme un créneau par téléphone, pas par mail.
      { name: 'phone', type: 'tel', label: 'Téléphone', required: true, max: 32, autocomplete: 'tel' },
      {
        name: 'formation',
        type: 'select',
        label: 'Formation souhaitée',
        required: false,
        options: [...FORMATION_OPTIONS],
      },
      { name: 'message', type: 'textarea', label: 'Votre demande', required: true, min: 20, max: 2000 },
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
      { label: 'Formations', href: '/#formations' },
      { label: 'Tarifs', href: '/#tarifs' },
      { label: 'Méthode', href: '/#methode' },
      { label: 'Avis', href: '/#avis' },
      { label: 'Contact', href: '/#contact' },
    ],
    footer: [
      { label: 'Mentions légales', href: '/mentions-legales/' },
      { label: 'Politique de confidentialité', href: '/politique-confidentialite/' },
      { label: 'Gestion des cookies', href: '/gestion-cookies/' },
    ],
    cta: { label: 'Voir les disponibilités', href: '/#reservation' },
  },

  blog: { postsPerPage: 12 },

  features: { analytics: false, darkMode: false, booking: false },
});
