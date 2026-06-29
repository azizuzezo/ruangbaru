import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ruangbaru.my.id'),
  title: {
    default: 'RuangBaru — Workspace untuk Tim Indonesia',
    template: '%s | RuangBaru',
  },
  description:
    'RuangBaru membantu tim mengorganisir proyek, tugas, catatan, dan kolaborasi dalam satu workspace. Tersedia gratis untuk tim hingga 5 anggota.',
  keywords: ['workspace', 'manajemen proyek', 'manajemen tugas', 'kolaborasi tim', 'Indonesia', 'kanban', 'catatan tim'],
  authors: [{ name: 'RuangBaru', url: 'https://ruangbaru.my.id' }],
  creator: 'RuangBaru',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://ruangbaru.my.id',
    title: 'RuangBaru — Workspace untuk Tim Indonesia',
    description: 'Kelola proyek, tugas, catatan, dan tim dalam satu workspace yang mudah digunakan.',
    siteName: 'RuangBaru',
    images: [{ url: '/logo.png', width: 1024, height: 1024, alt: 'RuangBaru Logo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RuangBaru — Workspace untuk Tim Indonesia',
    description: 'Kelola proyek, tugas, catatan, dan tim dalam satu workspace yang mudah digunakan.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
