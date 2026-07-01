import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Kebijakan Privasi',
  description: 'Kebijakan privasi RuangBaru: bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda.',
  path: '/privacy-policy',
});

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
