'use client';

import { useEffect, useRef, useState } from 'react';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

/**
 * Drop inside a <Link>: renders the link's icon, swapped for the shared
 * spinner while that navigation is pending. Same box size either way, so
 * nothing shifts (Next's own guidance for useLinkStatus).
 */
export function LinkPendingIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={className} /> : <Icon className={className} />;
}

/** Drop inside a <Link> with no icon: a fixed-size slot that shows a spinner while pending. */
export function LinkPendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden="true" className={cn('inline-flex size-3.5 shrink-0 transition-opacity', pending ? 'opacity-100' : 'opacity-0', className)}>
      {pending && <Spinner className="size-3.5" />}
    </span>
  );
}

/**
 * Thin brand-blue bar across the top of the app while a page change is in
 * flight. Starts on any same-origin link click to another path, finishes
 * when the pathname actually changes, and gives up after 10s so it can
 * never hang on screen.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const timers = useRef<number[]>([]);

  const clear = () => { timers.current.forEach((id) => window.clearTimeout(id)); timers.current = []; };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      clear();
      setPhase('loading');
      timers.current.push(window.setTimeout(() => setPhase('idle'), 10000));
    };
    // Capture phase: Next's <Link> calls preventDefault in its own handler.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    setPhase((p) => {
      if (p !== 'loading') return p;
      clear();
      timers.current.push(window.setTimeout(() => setPhase('idle'), 450));
      return 'done';
    });
  }, [pathname]);

  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <motion.div
          key="route-progress"
          role="progressbar"
          aria-label="Memuat halaman"
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          <motion.div
            className="h-full origin-left bg-primary shadow-[0_0_10px_var(--primary)]"
            initial={{ scaleX: 0.05 }}
            animate={{ scaleX: phase === 'done' ? 1 : 0.85 }}
            transition={phase === 'done' || reduce ? { duration: 0.2 } : { duration: 6, ease: [0.1, 0.8, 0.2, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
