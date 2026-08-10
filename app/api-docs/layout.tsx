import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Dokumentasi API',
  description:
    'Hubungkan workspace RuangBaru Anda ke alat lain lewat REST API — buat kunci API, kelola proyek dan tugas secara terprogram.',
  path: '/api-docs',
  keywords: ['API RuangBaru', 'REST API', 'integrasi workspace', 'dokumentasi developer'],
});

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
