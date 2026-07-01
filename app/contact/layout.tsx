import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Hubungi Kami',
  description:
    'Ada pertanyaan tentang RuangBaru? Hubungi tim kami melalui email atau formulir kontak — kami siap membantu tim Anda memulai.',
  path: '/contact',
  keywords: ['kontak RuangBaru', 'dukungan pelanggan', 'bantuan workspace'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
