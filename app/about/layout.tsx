import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Tentang Kami',
  description:
    'RuangBaru dibuat oleh Duacincin untuk membantu tim dan UMKM Indonesia bekerja lebih teratur dalam satu ruang kerja digital.',
  path: '/about',
  keywords: ['tentang RuangBaru', 'Duacincin', 'workspace Indonesia'],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
