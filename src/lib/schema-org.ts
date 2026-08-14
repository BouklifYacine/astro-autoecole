import { site } from '@/config/site.config';
import { absoluteUrl, origin } from '@/lib/seo';

/**
 * Typed schema.org builders.
 *
 * Only real schema.org properties — an invented field is ignored at best. Empty
 * values are dropped rather than emitted, so a partially filled site.config never
 * publishes `"telephone": ""`.
 *
 * Like buildSeo, these take paths and resolve the origin themselves.
 */
export type SchemaGraph = Record<string, unknown>;

function compact(input: SchemaGraph): SchemaGraph {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && Object.keys(value as object).length <= 1) return false;
      return true;
    }),
  );
}

export function organizationSchema(): SchemaGraph {
  const address = compact({
    '@type': 'PostalAddress',
    streetAddress: site.contact.address.street,
    postalCode: site.contact.address.postalCode,
    addressLocality: site.contact.address.city,
    addressCountry: site.contact.address.country,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    ...compact({
      name: site.legalName || site.name,
      url: origin,
      logo: site.brand.logo ? absoluteUrl(site.brand.logo) : '',
      email: site.contact.email,
      telephone: site.contact.phone,
      address,
      sameAs: site.sameAs,
    }),
  };
}

export function websiteSchema(): SchemaGraph {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: origin,
    inLanguage: site.lang,
  };
}

export function articleSchema(input: {
  title: string;
  description?: string;
  path: string;
  image?: string;
  publishedAt: Date;
  updatedAt?: Date;
  authorName?: string;
}): SchemaGraph {
  const publisher = site.legalName || site.name;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    url: absoluteUrl(input.path),
    datePublished: input.publishedAt.toISOString(),
    dateModified: (input.updatedAt ?? input.publishedAt).toISOString(),
    inLanguage: site.lang,
    author: { '@type': 'Organization', name: input.authorName || publisher },
    publisher: { '@type': 'Organization', name: publisher },
    ...compact({
      description: input.description ?? '',
      image: input.image ? absoluteUrl(input.image) : '',
    }),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): SchemaGraph {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]): SchemaGraph {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
