import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Fitur Workspace Tim',
  description:
    'Jelajahi fitur RuangBaru: papan kanban, manajemen tugas, kalender tim, catatan kolaboratif, dan rapat video native — semua dalam satu workspace untuk tim Indonesia.',
  path: '/fitur',
  keywords: ['fitur RuangBaru', 'papan kanban', 'manajemen tugas', 'kalender tim', 'rapat video'],
});

export default function FiturLayout({ children }: { children: React.ReactNode }) {
  return children;
}
