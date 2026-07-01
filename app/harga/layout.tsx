import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Harga & Paket Berlangganan',
  description:
    'Harga transparan RuangBaru. Mulai gratis untuk tim hingga 5 anggota, atau upgrade ke paket Tim untuk anggota dan proyek tanpa batas. Tanpa kartu kredit.',
  path: '/harga',
  keywords: ['harga RuangBaru', 'paket berlangganan', 'workspace gratis', 'harga aplikasi manajemen proyek'],
});

export default function HargaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
