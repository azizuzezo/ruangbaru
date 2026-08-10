'use client';

import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronRight, ArrowRight, Check, Video, Radio,
  AlertTriangle, Clock, Zap, ChevronDown,
  ExternalLink, Target, Users, Activity,
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials, formatRelativeTime } from '@/lib/utils';
import { useTour } from '@/components/tour/TourProvider';
import { JourneyButton } from '@/components/tour/JourneyButton';
import { usePresence, getPageLabel } from '@/lib/hooks/usePresence';
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';
import { useT } from '@/lib/i18n/useT';
import type { Task, Project, ActivityLog, Meeting } from '@/types';

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Member = { role: string; profile: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null };

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
};

const PRIORITY_LABEL_KEYS: Record<string, string> = {
  urgent: 'priorityUrgent',
  high: 'priorityHigh',
  medium: 'priorityMedium',
  low: 'priorityLow',
};

const PRESENCE_COLORS: Record<string, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-400',
  in_meeting: 'bg-violet-500',
  editing: 'bg-blue-500',
  viewing: 'bg-emerald-500',
};

// `actionKey` points at a dashboard dict key; `name` is sample demo content
// (not a UI string) shown only until real activity rows arrive.
const DEMO_ACTIVITY = [
  { who: 'Putri', actionKey: 'demoCompleted', name: 'Desain halaman onboarding', mins: 8 },
  { who: 'Adi', actionKey: 'demoCommented', name: 'Riset wawancara pengguna', mins: 35 },
  { who: 'Rani', actionKey: 'demoMovedToInProgress', name: 'Spesifikasi kalender', mins: 92 },
  { who: 'Budi', actionKey: 'activityProjectCreated', name: 'Peluncuran Q3', mins: 180 },
];

function greetingFor(hour: number, t: (key: string) => string) {
  if (hour < 11) return t('greetingMorning');
  if (hour < 15) return t('greetingAfternoon');
  if (hour < 18) return t('greetingEvening');
  return t('greetingNight');
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  backlog: 'statusBacklog', todo: 'statusTodo', in_progress: 'statusInProgress',
  in_review: 'statusInReview', done: 'statusDone', cancelled: 'statusCancelled',
};

// Maps the machine-readable `activity_logs.action` codes (written by the
// DB triggers in supabase/migrations/20260809_activity_log_triggers.sql)
// to the phrase shown in the feed.
function activityLabel(a: ActivityLog, t: (key: string) => string): string {
  switch (a.action) {
    case 'task.created': return t('activityTaskCreated');
    case 'task.status_changed': {
      const to = (a.metadata as { to?: string })?.to;
      if (to === 'done') return t('activityTaskCompleted');
      const statusLabel = to ? (STATUS_LABEL_KEYS[to] ? t(STATUS_LABEL_KEYS[to]) : to) : t('statusNew');
      return t('activityTaskMoved').replace('{status}', statusLabel);
    }
    case 'project.created': return t('activityProjectCreated');
    case 'member.joined': return t('activityMemberJoined');
    default: return a.action;
  }
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ─── Collapsible section header ────────────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  action,
  collapsed,
  onToggle,
}: {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
      <button onClick={onToggle} className="flex items-start gap-2 text-left group">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-foreground">{title}</h2>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                collapsed && '-rotate-90'
              )}
            />
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </button>
      {action}
    </div>
  );
}

// ─── Quick action overlay on task row ─────────────────────────────────────────
function TaskQuickActions({
  taskId,
  wsSlug,
  onComplete,
  onOpen,
}: {
  taskId: string;
  wsSlug: string;
  onComplete: () => void;
  onOpen: () => void;
}) {
  const t = useT('dashboard');
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('markComplete')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('openDetail')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default function DashboardPage() {
  const t = useT('dashboard');
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  const { maybeAutoStart } = useTour();
  const onlineMembers = usePresence('dashboard');
  const { statuses, doneKeys } = useTaskStatuses(currentWorkspace?.id);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const autoStarted = useRef(false);

  // Section collapse state
  const [focusCollapsed, setFocusCollapsed] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const [momentumCollapsed, setMomentumCollapsed] = useState(false);
  const [presenceCollapsed, setPresenceCollapsed] = useState(false);

  // Hover preview state
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;

    async function load() {
      try {
        setLoading(true);
        const [tasksRes, projectsRes, membersRes, activityRes, meetingsRes] = await Promise.all([
          supabase
            .from('tasks')
            .select('id,title,status,priority,due_date,assignee_id,project_id,completed_at, assignee:assignee_id(id,full_name,avatar_url), project:projects(id,name,icon,color)')
            .eq('workspace_id', wsId)
            .order('due_date', { ascending: true })
            .limit(300),
          supabase
            .from('projects')
            .select('id,name,icon,color,status')
            .eq('workspace_id', wsId)
            .eq('status', 'active')
            .limit(20),
          supabase
            .from('workspace_members')
            .select('role, profile:profiles(id,full_name,avatar_url,email)', { count: 'exact' })
            .eq('workspace_id', wsId)
            .limit(12),
          supabase
            .from('activity_logs')
            .select('*, user:profiles(full_name,avatar_url)')
            .eq('workspace_id', wsId)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('meetings')
            .select('id,title,room_name,status,scheduled_at,created_at')
            .eq('workspace_id', wsId)
            .in('status', ['live', 'scheduled'])
            .order('scheduled_at', { ascending: true })
            .limit(6),
        ]);

        setTasks((tasksRes.data as unknown as Task[]) || []);
        setProjects((projectsRes.data as Project[]) || []);
        setMembers((membersRes.data as unknown as Member[]) || []);
        setMemberCount(membersRes.count || (membersRes.data?.length ?? 0));
        setActivity((activityRes.data as unknown as ActivityLog[]) || []);
        setMeetings((meetingsRes.data as Meeting[]) || []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentWorkspace]);

  // Live activity feed — new rows (from the triggers in
  // supabase/migrations/20260809_activity_log_triggers.sql) appear without
  // a refresh. postgres_changes payloads don't include joined columns, so
  // each new row is re-fetched once with its `user` relation attached.
  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    const channel = supabase
      .channel(`activity-${wsId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `workspace_id=eq.${wsId}` },
        async (payload: { new: { id: string } }) => {
          const { data } = await supabase
            .from('activity_logs')
            .select('*, user:profiles(full_name,avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) setActivity((prev) => [data as unknown as ActivityLog, ...prev].slice(0, 8));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentWorkspace]);

  useEffect(() => {
    if (!loading && !autoStarted.current) {
      autoStarted.current = true;
      maybeAutoStart();
    }
  }, [loading, maybeAutoStart]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 864e5);
  const weekEnd = new Date(todayStart.getTime() + 7 * 864e5);
  const weekAgo = new Date(now.getTime() - 7 * 864e5);

  const derived = useMemo(() => {
    const isOpen = (t: Task) => !doneKeys.has(t.status) && t.status !== 'cancelled';
    const open = tasks.filter(isOpen);
    const doneThisWeek = tasks.filter((t) => doneKeys.has(t.status) && t.completed_at && new Date(t.completed_at) >= weekAgo).length;

    const mine = open.filter((t) => t.assignee_id && currentUser && t.assignee_id === currentUser.id);
    const due = (t: Task) => (t.due_date ? new Date(t.due_date) : null);
    const rank = (t: Task) => {
      const d = due(t);
      if (!d) return 4;
      if (d < todayStart) return 0;
      if (d < tomorrowStart) return 1;
      if (d < weekEnd) return 2;
      return 3;
    };
    const focus = [...mine].sort((a, b) => rank(a) - rank(b)).slice(0, 7);
    const myOverdue = mine.filter((t) => rank(t) === 0).length;
    const myToday = mine.filter((t) => rank(t) === 1).length;

    const withDue = open.filter((t) => t.due_date).sort((a, b) => +new Date(a.due_date!) - +new Date(b.due_date!));
    const groups: { label: string; tone: string; dotColor: string; items: Task[] }[] = [
      { label: t('groupOverdue'), tone: 'text-rose-600', dotColor: 'bg-rose-500', items: withDue.filter((t) => new Date(t.due_date!) < todayStart) },
      { label: t('groupToday'), tone: 'text-primary', dotColor: 'bg-primary', items: withDue.filter((t) => { const d = new Date(t.due_date!); return d >= todayStart && d < tomorrowStart; }) },
      { label: t('groupTomorrow'), tone: 'text-amber-600', dotColor: 'bg-amber-500', items: withDue.filter((t) => { const d = new Date(t.due_date!); return d >= tomorrowStart && d < new Date(tomorrowStart.getTime() + 864e5); }) },
      { label: t('groupThisWeek'), tone: 'text-emerald-600', dotColor: 'bg-emerald-500', items: withDue.filter((t) => { const d = new Date(t.due_date!); return d >= new Date(tomorrowStart.getTime() + 864e5) && d < weekEnd; }) },
    ].filter((g) => g.items.length > 0);

    const momentum = projects.map((p) => {
      const pTasks = tasks.filter((t) => t.project_id === p.id);
      const total = pTasks.length;
      const done = pTasks.filter((t) => doneKeys.has(t.status)).length;
      const inProgress = pTasks.filter((t) => t.status === 'in_progress').length;
      const overdue = pTasks.filter((t) => t.due_date && new Date(t.due_date) < todayStart && !doneKeys.has(t.status)).length;
      return { project: p, total, done, inProgress, overdue, pct: total ? Math.round((done / total) * 100) : 0 };
    }).sort((a, b) => b.total - a.total).slice(0, 4);

    return { open, doneThisWeek, focus, myOverdue, myToday, groups, momentum };
  }, [tasks, projects, currentUser, todayStart.getTime(), doneKeys, t]);

  const completeTask = useCallback(async (taskId: string) => {
    const doneStatus = statuses.find((s) => s.is_done)?.key || 'done';
    setCompleting((s) => new Set(s).add(taskId));
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: doneStatus, completed_at: new Date().toISOString() } : t)));
    await supabase.from('tasks').update({ status: doneStatus, completed_at: new Date().toISOString() }).eq('id', taskId);
    setTimeout(() => setCompleting((s) => { const n = new Set(s); n.delete(taskId); return n; }), 600);
  }, [statuses]);

  if (loading) return <DashboardSkeleton />;

  const firstName = currentUser?.full_name?.split(' ')[0] || t('defaultUserName');
  const wsSlug = currentWorkspace?.slug || 'dashboard';
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const summary = derived.myOverdue > 0
    ? t('summaryOverdue').replace('{today}', String(derived.myToday)).replace('{overdue}', String(derived.myOverdue))
    : derived.focus.length > 0
      ? t('summaryToday').replace('{today}', String(derived.myToday))
      : t('summaryClear');

  const pulse = [
    { label: t('pulseActiveProjects'), value: projects.length, tone: 'text-primary' },
    { label: t('pulseOpenTasks'), value: derived.open.length, tone: 'text-sky-600' },
    { label: t('pulseDoneThisWeek'), value: derived.doneThisWeek, tone: 'text-emerald-600' },
    { label: t('pulseTeamMembers'), value: memberCount, tone: 'text-amber-600' },
  ];

  const liveM = meetings.filter((m) => m.status === 'live');
  const upcomingM = meetings.filter((m) => m.status === 'scheduled');

  return (
    <TooltipProvider delayDuration={400}>
      <div className="space-y-5">

        {/* ── Greeting Header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: E }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {greetingFor(now.getHours(), t)}, {firstName}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="capitalize">{dateStr}</span>
              {' · '}
              <span className={derived.myOverdue > 0 ? 'text-rose-600 font-semibold' : ''}>{summary}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <JourneyButton />
            <Link href={`/${wsSlug}/tasks`}>
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> {t('addTaskButton')}
              </Button>
            </Link>
            <Link href={`/${wsSlug}/projects`}>
              <Button size="sm" className="gap-1 h-8 text-xs bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-3.5 w-3.5" /> {t('addProjectButton')}
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ── Attention Zone ──────────────────────────────────────────── */}
        <AnimatePresence>
          {(liveM.length > 0 || derived.myOverdue > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.35, ease: E }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                {liveM.map((m) => (
                  <Link
                    key={m.id}
                    href={`/${wsSlug}/meetings/${m.id}`}
                    className="group flex flex-1 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 transition-all hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-sm">
                      <Radio className="h-4 w-4 text-white animate-pulse" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">{t('liveMeetingLabel')}</p>
                      <p className="mt-0.5 truncate text-[11px] text-emerald-700 dark:text-emerald-400">{m.title}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm group-hover:bg-emerald-600 transition-colors">
                      {t('joinNowButton')}
                    </span>
                  </Link>
                ))}

                {derived.myOverdue > 0 && (
                  <Link
                    href={`/${wsSlug}/tasks`}
                    className="group flex flex-1 items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 transition-all hover:bg-rose-100 hover:border-rose-300 dark:border-rose-800 dark:bg-rose-950/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 shadow-sm">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                        {t('overdueAlert').replace('{count}', String(derived.myOverdue))}
                      </p>
                      <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">{t('overdueAlertSubtext')}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-rose-600 group-hover:text-rose-700 transition-colors">
                      {t('viewAllArrow')}
                    </span>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Workspace Pulse ─────────────────────────────────────────── */}
        <motion.div
          data-tour="pulse"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05, ease: E }}
          className="grid grid-cols-2 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-4 sm:divide-y-0 sm:divide-x"
        >
          {pulse.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="flex flex-col gap-1 p-4"
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.label}</span>
              <span className={cn('font-display text-2xl font-semibold tracking-tight', p.tone)}>{p.value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Upcoming meetings strip ──────────────────────────────────── */}
        {upcomingM.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08, ease: E }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Video className="h-4 w-4 text-primary" />
                {t('upcomingMeetingsTitle')}
              </h2>
              <Link href={`/${wsSlug}/meetings`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">{t('viewAll')} <ChevronRight className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-3">
              {upcomingM.slice(0, 3).map((m) => {
                const when = m.scheduled_at ? new Date(m.scheduled_at) : new Date(m.created_at);
                return (
                  <Link
                    key={m.id}
                    href={`/${wsSlug}/meetings/${m.id}`}
                    className="flex items-center justify-between gap-3 bg-card px-4 py-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{m.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {when.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{t('viewBadge')}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Main Grid ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Left column (2/3) */}
          <div className="space-y-5 lg:col-span-2">

            {/* Daily Focus */}
            <motion.section
              data-tour="focus"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1, ease: E }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <SectionHeader
                title={
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {t('focusTitle')}
                  </span>
                }
                subtitle={derived.focus.length > 0 ? t('focusSubtitle').replace('{count}', String(derived.focus.length)) : undefined}
                collapsed={focusCollapsed}
                onToggle={() => setFocusCollapsed((v) => !v)}
                action={
                  <Link href={`/${wsSlug}/tasks`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                      {t('viewAll')} <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                }
              />
              <AnimatePresence initial={false}>
                {!focusCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: E }}
                  >
                    {derived.focus.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <p className="text-sm font-semibold text-foreground">{t('focusEmptyTitle')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t('focusEmptyDesc')}</p>
                      </div>
                    ) : (
                      <ul>
                        {derived.focus.map((task, i) => {
                          const overdue = task.due_date && new Date(task.due_date) < todayStart;
                          const isCompleting = completing.has(task.id);
                          return (
                            <motion.li
                              key={task.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: isCompleting ? 0.4 : 1, x: 0, scale: isCompleting ? 0.98 : 1 }}
                              transition={{ duration: isCompleting ? 0.4 : 0.3, delay: isCompleting ? 0 : 0.12 + i * 0.035 }}
                              className="group flex items-center gap-3 border-b border-border px-5 py-3 last:border-0 hover:bg-accent/30 transition-colors"
                            >
                              {/* Complete button */}
                              <button
                                onClick={() => completeTask(task.id)}
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150',
                                  isCompleting
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-muted-foreground/25 text-transparent hover:border-emerald-500 hover:text-emerald-500'
                                )}
                                aria-label={t('markComplete')}
                              >
                                <Check className="h-3 w-3" />
                              </button>

                              {/* Task info */}
                              <button
                                onClick={() => setTaskDetailOpen(true, task.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className={cn('truncate text-xs font-bold text-foreground transition-all', isCompleting && 'line-through opacity-50')}>
                                    {task.title}
                                  </p>
                                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span className="truncate">{task.project?.name || t('noProject')}</span>
                                    {task.due_date && (
                                      <span className={cn('font-semibold', overdue ? 'text-rose-600' : 'text-muted-foreground')}>
                                        · {overdue ? t('overdueBadge') : new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {task.priority && task.priority !== 'no_priority' && (
                                  <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', PRIORITY_STYLES[task.priority])}>
                                    {t(PRIORITY_LABEL_KEYS[task.priority])}
                                  </span>
                                )}
                              </button>

                              {/* Quick actions (visible on hover) */}
                              <TaskQuickActions
                                taskId={task.id}
                                wsSlug={wsSlug}
                                onComplete={() => completeTask(task.id)}
                                onOpen={() => setTaskDetailOpen(true, task.id)}
                              />
                            </motion.li>
                          );
                        })}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Timeline */}
            <motion.section
              data-tour="timeline"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16, ease: E }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <SectionHeader
                title={
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    {t('timelineTitle')}
                  </span>
                }
                subtitle={t('timelineSubtitle')}
                collapsed={timelineCollapsed}
                onToggle={() => setTimelineCollapsed((v) => !v)}
              />
              <AnimatePresence initial={false}>
                {!timelineCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: E }}
                    className="p-5"
                  >
                    {derived.groups.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        {t('timelineEmpty')}
                      </p>
                    ) : (
                      <div className="space-y-5">
                        {derived.groups.map((g) => (
                          <div key={g.label} className="relative pl-5">
                            <span className={cn('absolute left-0 top-1 h-2 w-2 rounded-full', g.dotColor)} />
                            <span className="absolute left-[3px] top-3 h-[calc(100%-4px)] w-px bg-border" />
                            <p className={cn('text-[11px] font-bold uppercase tracking-wider', g.tone)}>{g.label}</p>
                            <ul className="mt-2 space-y-1">
                              {g.items.slice(0, 5).map((task) => (
                                <motion.li
                                  key={task.id}
                                  whileHover={{ x: 2 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <button
                                    onClick={() => setTaskDetailOpen(true, task.id)}
                                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50 group"
                                  >
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                                      {task.title}
                                    </span>
                                    {task.assignee ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-5 w-5">
                                            <AvatarImage src={task.assignee.avatar_url || ''} />
                                            <AvatarFallback className="text-[8px]">{getInitials(task.assignee.full_name)}</AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>{task.assignee.full_name || t('teamMemberFallback')}</TooltipContent>
                                      </Tooltip>
                                    ) : null}
                                  </button>
                                </motion.li>
                              ))}
                              {g.items.length > 5 && (
                                <li className="px-2 py-1 text-[10px] text-muted-foreground">
                                  {t('moreItems').replace('{count}', String(g.items.length - 5))}
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </div>

          {/* Right column (1/3) */}
          <div className="space-y-5">

            {/* Presence — Who's Online */}
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.11, ease: E }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <SectionHeader
                title={
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {t('activeNowTitle')}
                  </span>
                }
                subtitle={onlineMembers.length > 0 ? t('onlineCount').replace('{count}', String(onlineMembers.length)) : t('onlyYouOnline')}
                collapsed={presenceCollapsed}
                onToggle={() => setPresenceCollapsed((v) => !v)}
              />
              <AnimatePresence initial={false}>
                {!presenceCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: E }}
                  >
                    {onlineMembers.length === 0 ? (
                      <div className="px-5 py-5 text-center">
                        <p className="text-xs text-muted-foreground">{t('inviteEmptyDesc')}</p>
                        <Link href={`/${wsSlug}/team`} className="mt-3 inline-flex">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Plus className="h-3 w-3" /> {t('inviteTeamButton')}
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {onlineMembers.map((m, i) => (
                          <motion.li
                            key={m.userId}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
                          >
                            <div className="relative shrink-0">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={m.avatarUrl || ''} />
                                <AvatarFallback className="text-[9px]">{getInitials(m.fullName)}</AvatarFallback>
                              </Avatar>
                              <span className={cn(
                                'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card',
                                PRESENCE_COLORS[m.status] || 'bg-emerald-500'
                              )} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-bold text-foreground">{m.fullName || t('memberFallback')}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{getPageLabel(m.page)}</p>
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Activity Feed */}
            <motion.section
              data-tour="activity"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.13, ease: E }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <SectionHeader
                title={
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-500" />
                    {t('activityTitle')}
                  </span>
                }
                collapsed={activityCollapsed}
                onToggle={() => setActivityCollapsed((v) => !v)}
              />
              <AnimatePresence initial={false}>
                {!activityCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: E }}
                    className="p-3"
                  >
                    {activity.length === 0 ? (
                      <div>
                        <p className="px-2 pb-2 text-[10px] text-muted-foreground">{t('activityEmptyLabel')}</p>
                        <ul className="space-y-0.5">
                          {DEMO_ACTIVITY.map((a, i) => (
                            <ActivityRow key={i} name={a.who} action={t(a.actionKey)} resource={a.name} time={t('minutesAgo').replace('{mins}', String(a.mins))} avatarUrl={null} />
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <ul className="space-y-0.5">
                        {activity.map((a, i) => (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.14 + i * 0.04 }}
                          >
                            <ActivityRow
                              name={a.user?.full_name || t('someoneFallback')}
                              action={activityLabel(a, t)}
                              resource={a.action === 'member.joined' ? '' : (a.resource_name || '')}
                              time={formatRelativeTime(a.created_at)}
                              avatarUrl={a.user?.avatar_url || null}
                            />
                          </motion.div>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Project Momentum */}
            <motion.section
              data-tour="momentum"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.19, ease: E }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <SectionHeader
                title={
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    {t('projectsTitle')}
                  </span>
                }
                collapsed={momentumCollapsed}
                onToggle={() => setMomentumCollapsed((v) => !v)}
                action={
                  <Link href={`/${wsSlug}/projects`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                      {t('viewAll')} <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                }
              />
              <AnimatePresence initial={false}>
                {!momentumCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: E }}
                    className="space-y-2 p-3"
                  >
                    {derived.momentum.length === 0 ? (
                      <Link
                        href={`/${wsSlug}/projects`}
                        className="flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-4 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        {t('momentumEmpty')}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      derived.momentum.map((m) => (
                        <motion.div
                          key={m.project.id}
                          onHoverStart={() => setHoveredProject(m.project.id)}
                          onHoverEnd={() => setHoveredProject(null)}
                        >
                          <Link
                            href={`/${wsSlug}/projects/${m.project.id}`}
                            className="block rounded-xl border border-border p-3 transition-all hover:border-primary/30 hover:shadow-sm hover:bg-accent/20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.project.color || '#106CD8' }} />
                              <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{m.project.name}</span>
                              <span className="text-[10px] font-semibold text-muted-foreground">{m.done}/{m.total}</span>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${m.pct}%` }}
                                transition={{ duration: 0.8, ease: E }}
                                className="h-full rounded-full"
                                style={{ background: m.project.color || '#106CD8' }}
                              />
                            </div>
                            {/* Expanded details on hover */}
                            <AnimatePresence>
                              {hoveredProject === m.project.id && (m.inProgress > 0 || m.overdue > 0) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-2 flex gap-3 overflow-hidden"
                                >
                                  {m.inProgress > 0 && (
                                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded px-1.5 py-0.5">
                                      {t('inProgressCount').replace('{count}', String(m.inProgress))}
                                    </span>
                                  )}
                                  {m.overdue > 0 && (
                                    <span className="text-[10px] font-medium text-rose-600 bg-rose-50 rounded px-1.5 py-0.5">
                                      {t('momentumOverdueBadge').replace('{count}', String(m.overdue))}
                                    </span>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Link>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Team card */}
            <motion.section
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25, ease: E }}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {t('teamTitle')}
                </h2>
                <Link href={`/${wsSlug}/team`}>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">{t('manageButton')} <ChevronRight className="h-3.5 w-3.5" /></Button>
                </Link>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex -space-x-2">
                  {members.slice(0, 6).map((m, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-9 w-9 border-2 border-card cursor-pointer hover:z-10 hover:scale-105 transition-transform">
                          <AvatarImage src={m.profile?.avatar_url || ''} />
                          <AvatarFallback className="text-[10px]">{getInitials(m.profile?.full_name || m.profile?.email)}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>{m.profile?.full_name || m.profile?.email || t('memberFallback')}</TooltipContent>
                    </Tooltip>
                  ))}
                  {memberCount > 6 && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">
                      +{memberCount - 6}
                    </span>
                  )}
                </div>
                <Link href={`/${wsSlug}/team`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                    <Plus className="h-3.5 w-3.5" /> {t('inviteButton')}
                  </Button>
                </Link>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Activity Row ──────────────────────────────────────────────────────────────
function ActivityRow({ name, action, resource, time, avatarUrl }: {
  name: string; action: string; resource: string; time: string; avatarUrl: string | null;
}) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/40 transition-colors cursor-default">
      <Avatar className="mt-0.5 h-6 w-6 shrink-0">
        <AvatarImage src={avatarUrl || ''} />
        <AvatarFallback className="text-[9px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-snug text-muted-foreground">
          <span className="font-bold text-foreground">{name}</span>{' '}{action}
          {resource && <>{' '}<span className="font-semibold text-foreground">{resource}</span></>}
        </p>
        <p className="mt-0.5 text-[9px] text-muted-foreground/60">{time}</p>
      </div>
    </li>
  );
}

// ─── Dashboard Skeleton ────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      {/* Pulse */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 bg-card p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Focus skeleton */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Skeleton className="h-5 w-5 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              ))}
            </div>
          </div>
          {/* Timeline skeleton */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="space-y-5 p-5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="pl-5 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-7 w-full rounded-lg" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          {/* Presence skeleton */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="divide-y divide-border">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-2 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Activity skeleton */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-1 p-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-start gap-2.5 px-2 py-2">
                  <Skeleton className="h-6 w-6 rounded-full mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-2.5 w-full" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Momentum skeleton */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-2 p-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
