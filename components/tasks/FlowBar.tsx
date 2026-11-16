'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LinkPendingHint } from '@/components/layout/NavFeedback';

export interface FlowSegment {
  key: string;
  name: string;
  color: string;
  count: number;
}

/**
 * The workspace's Kanban columns as one segmented bar, each column in its
 * own admin-chosen colour and sized by how many tasks sit in it. It is the
 * product's identity motif: the same bar appears on the dashboard, above
 * the board and (thin, no legend) on every project row, so "where the work
 * is" always reads the same way.
 */
export function FlowBar({
  segments, onSelect, hrefFor, legend = true, size = 'md', className, label,
}: {
  segments: FlowSegment[];
  onSelect?: (key: string) => void;
  hrefFor?: (key: string) => string;
  legend?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const total = segments.reduce((n, s) => n + s.count, 0);
  const visible = segments.filter((s) => s.count > 0);

  return (
    <div className={cn('min-w-0', className)}>
      <div
        role="img"
        aria-label={label ?? segments.map((s) => `${s.name}: ${s.count}`).join(', ')}
        className={cn('flex w-full gap-[3px] overflow-hidden rounded-full', size === 'sm' ? 'h-1.5' : 'h-2.5', total === 0 && 'bg-muted')}
      >
        {visible.map((s, i) => (
          <motion.span
            key={s.key}
            className="h-full rounded-full"
            style={{ background: s.color }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${(s.count / total) * 100}%` }}
            transition={{ duration: 0.7, delay: reduce ? 0 : 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>

      {legend && (
        <ul className="mt-3 flex flex-wrap gap-x-1 gap-y-1">
          {segments.map((s) => {
            const body = (
              <>
                <span className="size-2 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                <span className="truncate">{s.name}</span>
                <span className="font-bold tabular-nums text-foreground">{s.count}</span>
              </>
            );
            const itemClass = 'inline-flex min-h-8 max-w-[14rem] items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
            return (
              <li key={s.key}>
                {hrefFor ? (
                  <Link href={hrefFor(s.key)} className={itemClass}>
                    {body}
                    <LinkPendingHint className="size-3" />
                  </Link>
                ) : onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(s.key)}
                    className={itemClass}
                  >
                    {body}
                  </button>
                ) : (
                  <span className="inline-flex min-h-8 max-w-[14rem] items-center gap-1.5 px-2 text-[11px] font-medium text-muted-foreground">{body}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
