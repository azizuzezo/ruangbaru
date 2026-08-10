'use client';

import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { useT } from '@/lib/i18n/useT';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

// Small client-side pieces of the (auth) layout's visible copy. Split out
// from app/(auth)/layout.tsx because that file exports `metadata`, which
// requires it to stay a server component — useT() needs a client boundary.

export function AuthTopBar() {
  const t = useT('auth');
  return (
    <div className="flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="flex items-center transition-transform hover:scale-[1.03]" aria-label={t('layoutHomeAriaLabel')}>
        <Logo variant="wordmark" height={30} priority />
      </Link>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <Link href="/" className="text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800">
          {t('layoutBackToHome')}
        </Link>
      </div>
    </div>
  );
}

export function AuthFooterNote() {
  const t = useT('auth');
  return (
    <p className="text-center text-xs text-neutral-400">
      &copy; {new Date().getFullYear()} {t('layoutFooterCopyright')}
    </p>
  );
}
