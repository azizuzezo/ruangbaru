'use client';

import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, PanelRightOpen, Radio, Clock, UserPlus, LayoutGrid } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { FlowBar, type FlowSegment } from '@/components/tasks/FlowBar';
import { LinkPendingHint, LinkPendingIcon } from '@/components/layout/NavFeedback';
import { cn, getInitials } from '@/lib/utils';
import { useT } from '@/lib/i18n/useT';
import { dueInfo, dueLabel, DUE_TONE, priorityMeta } from '@/lib/tasks/meta';
import type { Task, Meeting } from '@/types';
import { EASE } from './SectionCard';

const rowFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// ─── Shared bits ──────────────────────────────────────────────────────────────

function DueChip({ due, locale }: { due: string | null; locale: string }) {
  const tt = useT('tasks');
  const info = dueInfo(due);
  if (!info) return null;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', DUE_TONE[info.kind])}>
      <Clock className="size-3" />
      {dueLabel(info, tt, locale)}
    </span>
  );
}

function PersonAvatar({ name, url, className }: { name?: string | null; url?: string | null; className?: string }) {
  return (
    <Avatar className={cn('size-7 border-2 border-card', className)}>
      <AvatarImage src={url || ''} alt="" />
      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

export function RowsSkeleton({ rows = 4, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <div className="space-y-1.5 px-2 pb-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-2 py-2.5">
          <Skeleton className="size-6 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 rounded-full" style={{ width: `${70 - i * 9}%` }} />
            {tall && <Skeleton className="h-2.5 w-24 rounded-full" />}
          </div>
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      ))}
    </div>
  );
}

// ─── My focus ─────────────────────────────────────────────────────────────────

/**
 * The user's own open tasks, most urgent first. Completing one is the
 * page's most frequent action, so it gets the most physical feedback: the
 * box springs to a tick, the title strikes through, then the row folds away.
 */
export function FocusList({
  tasks, completing, onComplete, onOpen, wsSlug, locale,
}: {
  tasks: Task[];
  completing: Set<string>;
  onComplete: (id: string) => void;
  onOpen: (id: string) => void;
  wsSlug: string;
  locale: string;
}) {
  const t = useT('dashboard');
  const tt = useT('tasks');
  const reduce = useReducedMotion();

  if (tasks.length === 0) {
    return (
      <div className="mx-2 mb-1 flex flex-col items-start gap-4 rounded-2xl bg-muted/50 px-5 py-6 sm:flex-row sm:items-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <Check className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{t('focusEmptyTitle')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('focusEmptyDesc')}</p>
        </div>
        <Link href={`/${wsSlug}/tasks`} className={cn('inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary', rowFocus)}>
          <LinkPendingIcon icon={LayoutGrid} className="size-4" /> {t('openBoard')}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      <AnimatePresence initial={false}>
        {tasks.map((task, i) => {
          const done = completing.has(task.id);
          const prio = priorityMeta(task.priority);
          return (
            <motion.li
              key={task.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28, height: 0, marginTop: 0, transition: { duration: 0.32, ease: EASE } }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.035, 0.2), ease: EASE }}
              className="group relative flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-accent/60 focus-within:bg-accent/60"
            >
              <motion.button
                type="button"
                onClick={() => onComplete(task.id)}
                disabled={done}
                aria-label={`${t('markComplete')}: ${task.title}`}
                whileTap={reduce ? undefined : { scale: 0.85 }}
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-[9px] border-2 transition-colors',
                  done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/30 text-transparent hover:border-emerald-500 hover:text-emerald-500',
                  rowFocus,
                )}
              >
                <motion.span animate={done && !reduce ? { scale: [0.4, 1.25, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
                  <Check className="size-4" strokeWidth={3} />
                </motion.span>
              </motion.button>

              <button type="button" onClick={() => onOpen(task.id)} className={cn('flex min-w-0 flex-1 flex-col items-start rounded-lg py-0.5 text-left', rowFocus)}>
                <span className={cn('max-w-full truncate text-[13px] font-semibold text-foreground transition-all', done && 'text-muted-foreground line-through')}>
                  {task.title}
                </span>
                <span className="mt-1 flex max-w-full flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: task.project?.color || 'var(--primary)' }} />
                    <span className="truncate">{task.project?.name || t('noProject')}</span>
                  </span>
                  <DueChip due={task.due_date} locale={locale} />
                  {prio && (
                    <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', prio.chip)}>{tt(prio.labelKey)}</span>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpen(task.id)}
                aria-label={`${t('openDetail')}: ${task.title}`}
                className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground opacity-100 transition-all hover:bg-card hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100', rowFocus)}
              >
                <PanelRightOpen className="size-4" />
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

// ─── Deadlines timeline ──────────────────────────────────────────────────────

export interface DeadlineGroup { key: string; label: string; dot: string; items: Task[] }

export function DeadlineTimeline({ groups, onOpen }: { groups: DeadlineGroup[]; onOpen: (id: string) => void }) {
  const t = useT('dashboard');
  if (groups.length === 0) {
    return <p className="mx-2 mb-1 rounded-2xl bg-muted/50 px-5 py-6 text-xs text-muted-foreground">{t('timelineEmpty')}</p>;
  }
  return (
    <div className="space-y-4 px-2 pb-1">
      {groups.map((g) => (
        <div key={g.key} className="relative pl-6">
          <span className={cn('absolute left-[3px] top-[7px] size-2.5 rounded-full ring-4 ring-card', g.dot)} />
          <span className="absolute bottom-0 left-[7px] top-6 w-px bg-border" aria-hidden="true" />
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
            {g.label}
            <span className="rounded-md bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">{g.items.length}</span>
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {g.items.slice(0, 4).map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onOpen(task.id)}
                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/60', rowFocus)}
                >
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: task.project?.color || 'var(--primary)' }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{task.title}</span>
                  {task.assignee && <PersonAvatar name={task.assignee.full_name} url={task.assignee.avatar_url} className="size-6 border-0" />}
                </button>
              </li>
            ))}
            {g.items.length > 4 && <li className="px-2 py-1 text-[11px] text-muted-foreground">{t('moreItems').replace('{count}', String(g.items.length - 4))}</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Project momentum ────────────────────────────────────────────────────────

export interface MomentumRow {
  id: string; name: string; color: string; done: number; total: number; overdue: number; flow: FlowSegment[];
}

export function ProjectMomentum({ rows, wsSlug }: { rows: MomentumRow[]; wsSlug: string }) {
  const t = useT('dashboard');
  if (rows.length === 0) {
    return (
      <Link href={`/${wsSlug}/projects?new=1`} className={cn('mx-2 mb-1 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-5 py-5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground', rowFocus)}>
        {t('momentumEmpty')}
        <LinkPendingHint />
      </Link>
    );
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((p) => {
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
        return (
          <li key={p.id}>
            <Link
              href={`/${wsSlug}/projects/${p.id}`}
              className={cn('group block rounded-2xl border border-transparent px-3 py-3 transition-all hover:border-border hover:bg-accent/40', rowFocus)}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white" style={{ background: p.color || 'var(--primary)' }}>
                  {getInitials(p.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-semibold text-foreground">{p.name}</span>
                    <span className="shrink-0 text-lg font-semibold tabular-nums tracking-tight text-foreground">{pct}%</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{t('momentumDone').replace('{done}', String(p.done)).replace('{total}', String(p.total))}</span>
                    {p.overdue > 0 && <span className="rounded-md bg-rose-500/12 px-1.5 font-semibold text-rose-700 dark:text-rose-300">{t('momentumOverdueBadge').replace('{count}', String(p.overdue))}</span>}
                    <LinkPendingHint className="ml-auto" />
                  </div>
                </div>
              </div>
              <FlowBar segments={p.flow} legend={false} size="sm" className="mt-3 pl-12" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface OnlineMember { userId: string; fullName: string | null; avatarUrl: string | null; status: string; page: string }
export interface MemberLite { id: string; name: string | null; avatar: string | null }

const PRESENCE_DOT: Record<string, string> = {
  online: 'bg-emerald-500', viewing: 'bg-emerald-500', editing: 'bg-primary', away: 'bg-amber-400', in_meeting: 'bg-violet-500',
};

export function TeamPanel({
  online, members, memberCount, pageLabel, wsSlug,
}: {
  online: OnlineMember[];
  members: MemberLite[];
  memberCount: number;
  pageLabel: (page: string) => string;
  wsSlug: string;
}) {
  const t = useT('dashboard');
  return (
    <div className="space-y-4 px-2 pb-1">
      {online.length > 0 ? (
        <ul className="space-y-0.5">
          {online.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
              <span className="relative shrink-0">
                <PersonAvatar name={m.fullName} url={m.avatarUrl} className="size-8 border-0" />
                <span className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card', PRESENCE_DOT[m.status] || 'bg-emerald-500')} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{m.fullName || t('memberFallback')}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{pageLabel(m.page)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 text-xs text-muted-foreground">{t('onlyYouOnline')}</p>
      )}

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-3 py-3">
        <div className="flex -space-x-2">
          {members.slice(0, 6).map((m) => (
            <PersonAvatar key={m.id} name={m.name} url={m.avatar} className="size-8 transition-transform hover:z-10 hover:-translate-y-0.5" />
          ))}
          {memberCount > 6 && (
            <span className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">+{memberCount - 6}</span>
          )}
        </div>
        <Link href={`/${wsSlug}/team`} className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl bg-card px-3 text-xs font-semibold text-foreground shadow-xs transition-colors hover:text-primary', rowFocus)}>
          <LinkPendingIcon icon={UserPlus} className="size-3.5" /> {t('inviteButton')}
        </Link>
      </div>
    </div>
  );
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface ActivityItem { id: string; name: string; avatar: string | null; action: string; resource: string; time: string }

/** New realtime rows slide in at the top; that motion is the "live" signal. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const t = useT('dashboard');
  const reduce = useReducedMotion();
  if (items.length === 0) {
    return <p className="mx-2 mb-1 rounded-2xl bg-muted/50 px-5 py-6 text-xs text-muted-foreground">{t('activityEmpty')}</p>;
  }
  return (
    <ul className="relative space-y-0.5 px-2 pb-1">
      <span className="absolute bottom-4 left-[21px] top-4 w-px bg-border" aria-hidden="true" />
      <AnimatePresence initial={false}>
        {items.map((a) => (
          <motion.li
            key={a.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="relative flex items-start gap-3 rounded-xl px-1.5 py-2"
          >
            <PersonAvatar name={a.name} url={a.avatar} className="size-7 ring-4 ring-card" />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{a.name}</span> {a.action}
                {a.resource && <> <span className="font-medium text-foreground">{a.resource}</span></>}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{a.time}</p>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export function LiveMeetingBanner({ meetings, wsSlug }: { meetings: Meeting[]; wsSlug: string }) {
  const t = useT('dashboard');
  if (meetings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {meetings.map((m) => (
        <Link
          key={m.id}
          href={`/${wsSlug}/meetings/${m.id}`}
          className={cn('group flex flex-1 items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 transition-colors hover:bg-emerald-500/15', rowFocus)}
        >
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <span className="absolute inset-0 animate-ping rounded-xl bg-emerald-500/40 motion-reduce:hidden" />
            <Radio className="relative size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300">{t('liveMeetingLabel')}</span>
            <span className="block truncate text-[13px] font-medium text-foreground">{m.title}</span>
          </span>
          <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors group-hover:bg-emerald-700">
            <LinkPendingHint className="text-white" />
            {t('joinNowButton')}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function UpcomingMeetings({ meetings, wsSlug, locale }: { meetings: Meeting[]; wsSlug: string; locale: string }) {
  return (
    <ul className="space-y-1 px-1 pb-1">
      {meetings.slice(0, 3).map((m) => {
        const when = new Date(m.scheduled_at || m.created_at);
        return (
          <li key={m.id}>
            <Link href={`/${wsSlug}/meetings/${m.id}`} className={cn('flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-accent/60', rowFocus)}>
              <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 leading-none text-primary">
                <span className="text-[10px] font-semibold uppercase">{when.toLocaleDateString(locale, { month: 'short' })}</span>
                <span className="text-base font-semibold">{when.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{m.title}</span>
                <span className="block text-[11px] text-muted-foreground">{when.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <LinkPendingHint />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
