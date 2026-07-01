import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'RuangBaru — Workspace untuk Tim Indonesia',
    template: '%s | RuangBaru',
  },
  description:
    'RuangBaru membantu tim mengorganisir proyek, tugas, catatan, dan kolaborasi dalam satu workspace. Tersedia gratis untuk tim hingga 5 anggota.',
  keywords: ['RuangBaru', 'workspace', 'manajemen proyek', 'manajemen tugas', 'kolaborasi tim', 'Indonesia', 'kanban', 'catatan tim', 'aplikasi manajemen proyek Indonesia'],
  authors: [{ name: 'RuangBaru', url: SITE_URL }],
  creator: 'RuangBaru',
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: SITE_URL,
    title: 'RuangBaru — Workspace untuk Tim Indonesia',
    description: 'Kelola proyek, tugas, catatan, dan tim dalam satu workspace yang mudah digunakan.',
    siteName: 'RuangBaru',
    // Image comes from app/opengraph-image.tsx (dynamic, 1200×630, branded).
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RuangBaru — Workspace untuk Tim Indonesia',
    description: 'Kelola proyek, tugas, catatan, dan tim dalam satu workspace yang mudah digunakan.',
    // Falls back to app/opengraph-image.tsx.
  },
  robots: { index: true, follow: true },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
};

// Sitewide structured data — helps Google understand RuangBaru as a brand
// entity (Organization) and enables the search box / sitelinks (WebSite).
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: 'RuangBaru adalah workspace kolaborasi untuk tim dan UMKM Indonesia — proyek, tugas, kalender, catatan, dan rapat video dalam satu ruang.',
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'id-ID',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
