import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo';

// Internal admin tooling — never indexed.
export const metadata: Metadata = NOINDEX;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
