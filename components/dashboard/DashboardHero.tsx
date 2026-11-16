'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, FolderPlus, type LucideIcon } from 'lucide-react';
import { CountUp } from '@/components/ui/count-up';
import { Skeleton } from '@/components/ui/skeleton';
import { JourneyButton } from '@/components/tour/JourneyButton';
import { FlowBar, type FlowSegment } from '@/components/tasks/FlowBar';
import { LinkPendingIcon, LinkPendingHint } from '@/components/layout/NavFeedback';
import { useT } from '@/lib/i18n/useT';
import { EASE } from './SectionCard';

export interface HeroStat {
  label: string;
  value: number | null; // null while its query is still loading
  href: string;
  icon: LucideIcon;
}

/**
 * The dashboard's single focal point: a solid brand-blue panel (the one
 * place the blue is used at full strength) carrying the greeting, today's
 * summary and the four workspace numbers. Its white tray holds the flow
 * bar, the motif that links the dashboard to the Kanban board.
 */
export function DashboardHero({
  workspaceName, greeting, dateLabel, summary, urgent, summaryHref, stats, flow, flowLoading, wsSlug,
}: {
  workspaceName: string;
  greeting: string;
  dateLabel: string;
  summary: string;
  urgent: boolean;
  summaryHref: string;
  stats: HeroStat[];
  flow: FlowSegment[];
  flowLoading: boolean;
  wsSlug: string;
}) {
  const t = useT('dashboard');
  const reduce = useReducedMotion();
  const flowTotal = flow.reduce((n, s) => n + s.count, 0);

  return (
    <motion.section
      data-tour="pulse"
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative overflow-hidden rounded-[28px] bg-hero text-hero-foreground"
    >
      {/* Motif: nested rounded rooms, a literal reading of "ruang". Thin and
          faint so it gives the panel depth without competing with the text. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -right-24 -top-28 h-[420px] w-[420px] text-white opacity-[0.13] sm:-right-10"
        fill="none"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={40 + i * 34} y={40 + i * 34} width={320 - i * 68} height={320 - i * 68} rx={64 - i * 10} stroke="currentColor" strokeWidth="1.5" />
        ))}
      </svg>

      <div className="relative grid gap-7 px-5 pb-6 pt-6 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{workspaceName}</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-[40px]">
            {greeting}
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-white">
            <span className="capitalize">{dateLabel}</span>
            <span aria-hidden="true" className="hidden text-white/60 sm:inline">/</span>
            {urgent ? (
              // The page's one yellow accent: only when something is late.
              <Link
                href={summaryHref}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FDB31A] px-3 py-1 text-xs font-semibold text-[#2B1D00] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hero"
              >
                {summary}
                <LinkPendingHint />
              </Link>
            ) : (
              <span className="font-medium">{summary}</span>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Link
              href={`/${wsSlug}/tasks?new=1`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-3.5 text-[13px] font-semibold sm:px-4 sm:text-sm text-[#0D59B4] shadow-sm transition-all hover:-translate-y-px hover:shadow-md active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-hero"
            >
              <LinkPendingIcon icon={Plus} className="size-4" />
              {t('heroNewTask')}
            </Link>
            <Link
              href={`/${wsSlug}/projects?new=1`}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/40 px-3.5 text-[13px] font-semibold text-white sm:px-4 sm:text-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <LinkPendingIcon icon={FolderPlus} className="size-4" />
              {t('heroNewProject')}
            </Link>
            <JourneyButton className="h-11 rounded-xl border-white/40 bg-transparent px-3.5 text-[13px] text-white sm:px-4 sm:text-sm shadow-none hover:border-white hover:bg-white/10 [&_svg]:text-white" />
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-2.5">
          {stats.map((s, i) => (
            <motion.li
              key={s.label}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.07, ease: EASE }}
            >
              <Link
                href={s.href}
                // Solid (not translucent) so the motif never shows through the numbers.
                className="group flex h-full flex-col justify-between gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--hero)_80%,#000)] p-4 transition-colors hover:bg-[color-mix(in_srgb,var(--hero)_70%,#000)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium leading-snug text-white">{s.label}</span>
                  <LinkPendingIcon icon={s.icon} className="size-4 shrink-0 text-white/80 transition-transform group-hover:scale-110" />
                </span>
                {s.value === null ? (
                  <Skeleton className="h-9 w-12 bg-white/20" />
                ) : (
                  <CountUp value={s.value} className="text-[34px] font-semibold leading-none tracking-tight tabular-nums" />
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Flow tray */}
      <div className="relative mx-2 mb-2 rounded-[22px] bg-card px-5 py-4 text-foreground sm:px-6">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-sm font-semibold tracking-tight">
            {t('flowTitle')}
            {!flowLoading && flowTotal > 0 && (
              <span className="ml-2 text-xs font-medium text-muted-foreground">{t('flowSubtitle').replace('{count}', String(flowTotal))}</span>
            )}
          </h2>
          <Link
            href={`/${wsSlug}/tasks`}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('openBoard')}
            <LinkPendingHint />
          </Link>
        </div>
        {flowLoading ? (
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="flex gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-20" />)}</div>
          </div>
        ) : flow.length === 0 || flowTotal === 0 ? (
          <p className="text-xs text-muted-foreground">{t('flowEmpty')}</p>
        ) : (
          <FlowBar segments={flow} hrefFor={(key) => `/${wsSlug}/tasks?col=${encodeURIComponent(key)}`} />
        )}
      </div>
    </motion.section>
  );
}
