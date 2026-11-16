'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Two-to-four-way toggle. The active pill slides between options (shared
 * layout transition) so the change of mode is seen, not just swapped.
 * Each instance needs its own `id` so two toggles never share one pill.
 */
export function Segmented<T extends string>({
  id, value, onChange, options, className,
}: {
  id: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div role="radiogroup" className={cn('inline-flex h-11 items-center gap-0.5 rounded-xl border border-border bg-card p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-lg bg-primary/10"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {o.icon && <o.icon className="relative size-3.5" />}
            {/* With an icon, phones show the icon alone (label stays for screen readers). */}
            <span className={cn('relative', o.icon && 'sr-only sm:not-sr-only')}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
