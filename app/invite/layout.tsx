import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo';

// Workspace invite links carry a one-time token — never index these URLs.
export const metadata: Metadata = NOINDEX;

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
