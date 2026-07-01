import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.startsWith('http')
  ? process.env.NEXT_PUBLIC_APP_URL
  : 'https://ruangbaru.my.id';

export const SITE_NAME = 'RuangBaru';

/**
 * Build page-level metadata that inherits the root's title template, OG, and
 * Twitter card defaults while overriding the parts that make each page unique.
 * Pass `path` (e.g. "/fitur") so the canonical URL and OG url stay in sync.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  noIndex,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    keywords,
    alternates: { canonical: path },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

/** Shorthand for utility/account pages that should never be indexed. */
export const NOINDEX: Metadata = {
  robots: { index: false, follow: true },
};
