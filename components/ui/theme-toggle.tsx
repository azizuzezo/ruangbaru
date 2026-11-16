'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Light/dark toggle. The mounted guard is required because next-themes only
 * knows the resolved theme on the client; rendering the icon during SSR would
 * mismatch (and flash the wrong icon until hydration).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
      title={isDark ? 'Tema terang' : 'Tema gelap'}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card/60',
        'text-muted-foreground transition-all duration-150 active:scale-95',
        'hover:bg-accent hover:text-foreground hover:border-primary/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
