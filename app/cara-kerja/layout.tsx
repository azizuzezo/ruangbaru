import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Cara Kerja RuangBaru',
  description:
    'Pelajari cara memulai dengan RuangBaru: buat workspace, tambahkan proyek dan tugas, lalu bekerja bersama tim — semua dalam hitungan menit.',
  path: '/cara-kerja',
  keywords: ['cara kerja RuangBaru', 'panduan workspace', 'onboarding tim'],
});

export default function CaraKerjaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
