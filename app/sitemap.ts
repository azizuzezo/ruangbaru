import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Public marketing pages only — auth, app-workspace, and utility routes are
// excluded (see app/robots.ts) since they require a login and have no
// indexable content of their own.
const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/fitur', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/harga', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/cara-kerja', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms-of-service', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
