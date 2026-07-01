import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/callback',
          '/admin',
          '/dashboard',
          '/invite/',
          // Workspace app shell — requires auth, no indexable content.
          '/*/dashboard',
          '/*/projects',
          '/*/tasks',
          '/*/calendar',
          '/*/notes',
          '/*/team',
          '/*/settings',
          '/*/billing',
          '/*/meetings',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
