import type { Metadata } from 'next';
import { NOINDEX } from '@/lib/seo';

// Post-signup onboarding flow — not a public content page.
export const metadata: Metadata = NOINDEX;

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
