import type { TaskPriority } from '@/types';

/**
 * Shared task presentation rules, so the dashboard and the Kanban board
 * describe priority and due dates the same way.
 */

export const PRIORITY_META: Record<Exclude<TaskPriority, 'no_priority'>, { labelKey: string; text: string; chip: string; rank: number }> = {
  urgent: { labelKey: 'priorityUrgent', text: 'text-rose-600 dark:text-rose-400', chip: 'bg-rose-500/12 text-rose-700 dark:text-rose-300', rank: 0 },
  high: { labelKey: 'priorityHigh', text: 'text-orange-600 dark:text-orange-400', chip: 'bg-orange-500/12 text-orange-700 dark:text-orange-300', rank: 1 },
  medium: { labelKey: 'priorityMedium', text: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-500/12 text-amber-700 dark:text-amber-300', rank: 2 },
  low: { labelKey: 'priorityLow', text: 'text-sky-600 dark:text-sky-400', chip: 'bg-sky-500/12 text-sky-700 dark:text-sky-300', rank: 3 },
};

export function priorityMeta(p: TaskPriority | null | undefined) {
  return p && p !== 'no_priority' ? PRIORITY_META[p] : null;
}

/** `YYYY-MM-DD` is a calendar day, so read it as local midnight, not UTC. */
export function parseDue(due: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(due);
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export type DueKind = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later';

export interface DueInfo {
  kind: DueKind;
  /** Whole days late (overdue) or ahead (others). */
  days: number;
  date: Date;
}

export function dueInfo(due: string | null | undefined, now = new Date()): DueInfo | null {
  if (!due) return null;
  const date = startOfDay(parseDue(due));
  const days = Math.round((date.getTime() - startOfDay(now).getTime()) / 864e5);
  const kind: DueKind = days < 0 ? 'overdue' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 7 ? 'week' : 'later';
  return { kind, days: Math.abs(days), date };
}

export const DUE_TONE: Record<DueKind, string> = {
  overdue: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  today: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  tomorrow: 'bg-primary/10 text-primary',
  week: 'bg-muted text-muted-foreground',
  later: 'bg-muted text-muted-foreground',
};

/** Label for a due chip; `t` is the `tasks` namespace translator. */
export function dueLabel(info: DueInfo, t: (k: string) => string, locale = 'id-ID') {
  switch (info.kind) {
    case 'overdue': return t('dueOverdue').replace('{days}', String(info.days));
    case 'today': return t('dueToday');
    case 'tomorrow': return t('dueTomorrow');
    default: return info.date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  }
}

/**
 * Every task has a per-workspace number (#1, #2 ...) and its own page at
 * /<workspace-slug>/tasks/<number>. Emails, in-app notifications and the
 * "copy link" button all build the link here so they never drift apart.
 */
export function taskRef(taskNumber: number | null | undefined): string {
  return taskNumber ? `#${taskNumber}` : '';
}

export function taskPath(workspaceSlug: string, taskNumber: number | null | undefined): string {
  return taskNumber ? `/${workspaceSlug}/tasks/${taskNumber}` : `/${workspaceSlug}/tasks`;
}
