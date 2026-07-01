import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Ketentuan Layanan',
  description: 'Ketentuan layanan RuangBaru: syarat dan ketentuan penggunaan platform workspace kami.',
  path: '/terms-of-service',
});

export default function TermsOfServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
