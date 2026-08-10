'use client';

import { cn } from '@/lib/utils';
import { useLocale } from '@/lib/i18n/locale-context';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center rounded-full border border-neutral-200 bg-white p-0.5 text-xs font-semibold',
        className
      )}
    >
      {(['id', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={cn(
            'rounded-full px-2.5 py-1 transition-colors',
            locale === l ? 'bg-[#106CD8] text-white' : 'text-neutral-500 hover:text-neutral-800'
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
