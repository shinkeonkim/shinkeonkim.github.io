import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_SOCIAL,
  SITE_TITLE,
  SITE_URL,
} from '@/shared/config';

type SchemaObject = Record<string, unknown>;

export function personSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: SITE_AUTHOR,
    alternateName: 'shinkeonkim',
    url: SITE_URL,
    image: `${SITE_URL}/apple-touch-icon.png`,
    sameAs: SITE_SOCIAL,
    knowsAbout: SITE_KEYWORDS,
  };
}

export function websiteSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_TITLE,
    alternateName: 'shinkeonkim',
    url: SITE_URL,
    inLanguage: SITE_LOCALE,
    description: SITE_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#person` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface CollectionPageOptions {
  name: string;
  description: string;
  url: string;
  itemCount?: number;
}

export function collectionPageSchema(opts: CollectionPageOptions): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: SITE_LOCALE,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    ...(opts.itemCount !== undefined && {
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: opts.itemCount,
      },
    }),
  };
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}
