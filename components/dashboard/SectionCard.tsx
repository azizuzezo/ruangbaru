'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';

export const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * Frame shared by every dashboard section. It owns the three data states
 * (antislop R-27): `loading` swaps the body for the section's own skeleton
 * and spins in the header, `error` shows an inline retry for this section
 * only, otherwise the children render. Sections enter one after another
 * (`order`) so the eye is walked down the page once, on first load only.
 */
export function SectionCard({
  title, icon: Icon, iconClass, subtitle, action, loading, error, onRetry, skeleton,
  children, className, tour, order = 0, bodyClass,
}: {
  title: string;
  icon: LucideIcon;
  iconClass?: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  tour?: string;
  order?: number;
  bodyClass?: string;
}) {
  const t = useT('dashboard');
  const reduce = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const state = loading ? 'loading' : error ? 'error' : 'ready';

  return (
    <motion.section
      data-tour={tour}
      aria-busy={loading || undefined}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 + order * 0.06, ease: EASE }}
      className={cn('flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card', className)}
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          className="group flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', iconClass ?? 'bg-primary/10 text-primary')}>
            {loading ? <Spinner className="size-4" label={t('sectionLoading')} /> : <Icon className="size-4" />}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
              <ChevronDown className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground', collapsed && '-rotate-90')} />
            </span>
            {subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtitle}</span>}
          </span>
        </button>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={cn('flex-1', bodyClass ?? 'px-3 pb-3')}
              >
                {state === 'loading' && <div aria-hidden="true">{skeleton}</div>}
                {state === 'error' && (
                  <div role="alert" className="mx-2 mb-2 flex flex-col items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-4 sm:flex-row sm:items-center">
                    <p className="flex-1 text-xs text-foreground">{t('sectionError')}</p>
                    {onRetry && (
                      <Button size="sm" variant="outline" onClick={onRetry} className="h-9 gap-1.5 text-xs">
                        <RefreshCw /> {t('retry')}
                      </Button>
                    )}
                  </div>
                )}
                {state === 'ready' && children}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
