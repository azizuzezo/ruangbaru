'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Target, CalendarClock, FolderKanban, Users, Activity, Video, ListTodo, CheckCircle2 } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils';
import { useTour } from '@/components/tour/TourProvider';
import { usePresence, getPageLabel } from '@/lib/hooks/usePresence';
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';
import { useRealtimeTasks } from '@/lib/hooks/useRealtimeTasks';
import { useSectionData } from '@/lib/hooks/useSectionData';
import { notifyCollaborationEmail } from '@/lib/client/notify-email';
import { useT } from '@/lib/i18n/useT';
import { useLocale } from '@/lib/i18n/locale-context';
import { dueInfo, PRIORITY_META } from '@/lib/tasks/meta';
import { DashboardHero } from '@/components/dashboard/DashboardHero';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { LinkPendingHint } from '@/components/layout/NavFeedback';
import {
  FocusList, DeadlineTimeline, ProjectMomentum, TeamPanel, ActivityFeed,
  LiveMeetingBanner, UpcomingMeetings, RowsSkeleton,
  type DeadlineGroup, type MomentumRow, type ActivityItem,
} from '@/components/dashboard/panels';
import type { Task, Project, ActivityLog, Meeting } from '@/types';

type Member = { role: string; profile: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null };

const STATUS_LABEL_KEYS: Record<string, string> = {
  backlog: 'statusBacklog', todo: 'statusTodo', in_progress: 'statusInProgress',
  in_review: 'statusInReview', done: 'statusDone', cancelled: 'statusCancelled',
};

function greetingFor(hour: number, t: (key: string) => string) {
  if (hour < 11) return t('greetingMorning');
  if (hour < 15) return t('greetingAfternoon');
  if (hour < 18) return t('greetingEvening');
  return t('greetingNight');
}

function activityLabel(a: ActivityLog, t: (key: string) => string, statusName: (key: string) => string | undefined): string {
  switch (a.action) {
    case 'task.created': return t('activityTaskCreated');
    case 'task.status_changed': {
      const to = (a.metadata as { to?: string })?.to;
      if (to === 'done') return t('activityTaskCompleted');
      const label = to ? (statusName(to) ?? (STATUS_LABEL_KEYS[to] ? t(STATUS_LABEL_KEYS[to]) : to)) : t('statusNew');
      return t('activityTaskMoved').replace('{status}', label);
    }
    case 'project.created': return t('activityProjectCreated');
    case 'member.joined': return t('activityMemberJoined');
    default: return a.action;
  }
}

export default function DashboardPage() {
  const t = useT('dashboard');
  const { locale } = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'id-ID';
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  const { maybeAutoStart } = useTour();
  const onlineMembers = usePresence('dashboard');
  const { statuses, doneKeys, loading: statusesLoading } = useTaskStatuses(currentWorkspace?.id);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const autoStarted = useRef(false);
  const supabase = createClient();

  const wsId = currentWorkspace?.id;
  const ready = !!wsId;

  // Each section loads on its own: a slow query only holds back its own card.
  const tasksQ = useSectionData<Task[]>(ready, async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id,title,status,priority,due_date,assignee_id,project_id,completed_at,position, assignee:assignee_id(id,full_name,avatar_url), creator:created_by(id,full_name,avatar_url,email), project:projects(id,name,icon,color)')
      .eq('workspace_id', wsId)
      .order('due_date', { ascending: true })
      .limit(300);
    if (error) throw error;
    return (data as unknown as Task[]) || [];
  }, [wsId], []);

  const projectsQ = useSectionData<Project[]>(ready, async () => {
    const { data, error } = await supabase.from('projects').select('id,name,icon,color,status').eq('workspace_id', wsId).eq('status', 'active').limit(20);
    if (error) throw error;
    return (data as Project[]) || [];
  }, [wsId], []);

  const membersQ = useSectionData<{ list: Member[]; count: number }>(ready, async () => {
    const { data, count, error } = await supabase.from('workspace_members').select('role, profile:profiles(id,full_name,avatar_url,email)', { count: 'exact' }).eq('workspace_id', wsId).limit(12);
    if (error) throw error;
    return { list: (data as unknown as Member[]) || [], count: count || (data?.length ?? 0) };
  }, [wsId], { list: [], count: 0 });

  const activityQ = useSectionData<ActivityLog[]>(ready, async () => {
    const { data, error } = await supabase.from('activity_logs').select('*, user:profiles(full_name,avatar_url)').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(8);
    if (error) throw error;
    return (data as unknown as ActivityLog[]) || [];
  }, [wsId], []);

  const meetingsQ = useSectionData<Meeting[]>(ready, async () => {
    const { data, error } = await supabase.from('meetings').select('id,title,room_name,status,scheduled_at,created_at').eq('workspace_id', wsId).in('status', ['live', 'scheduled']).order('scheduled_at', { ascending: true }).limit(6);
    if (error) throw error;
    return (data as Meeting[]) || [];
  }, [wsId], []);

  const tasks = tasksQ.data;
  const setTasks = tasksQ.setData;
  const projects = projectsQ.data;

  // A task created/moved by a teammate updates the numbers and lists here too.
  useRealtimeTasks(wsId, setTasks as React.Dispatch<React.SetStateAction<Task[]>>);

  // Live activity feed: new rows appear without a refresh.
  const setActivity = activityQ.setData;
  useEffect(() => {
    if (!wsId || !supabase?.channel) return;
    const channel = supabase
      .channel(`activity-${wsId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `workspace_id=eq.${wsId}` },
        async (payload: { new: { id: string } }) => {
          const { data } = await supabase.from('activity_logs').select('*, user:profiles(full_name,avatar_url)').eq('id', payload.new.id).single();
          if (data) setActivity((prev) => [data as unknown as ActivityLog, ...prev.filter((a) => a.id !== (data as ActivityLog).id)].slice(0, 8));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId]);

  useEffect(() => {
    if (!tasksQ.loading && !autoStarted.current) {
      autoStarted.current = true;
      maybeAutoStart();
    }
  }, [tasksQ.loading, maybeAutoStart]);

  const derived = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const isOpen = (x: Task) => !doneKeys.has(x.status) && x.status !== 'cancelled';
    const open = tasks.filter(isOpen);
    const doneThisWeek = tasks.filter((x) => doneKeys.has(x.status) && x.completed_at && new Date(x.completed_at) >= weekAgo).length;

    // Rows being ticked off stay listed for their exit animation.
    const mine = tasks.filter((x) => x.assignee_id && currentUser && x.assignee_id === currentUser.id && (isOpen(x) || completing.has(x.id)));
    const rank = (x: Task) => {
      const d = dueInfo(x.due_date, now);
      const dueRank = !d ? 5 : d.kind === 'overdue' ? 0 : d.kind === 'today' ? 1 : d.kind === 'tomorrow' ? 2 : d.kind === 'week' ? 3 : 4;
      const prio = x.priority && x.priority !== 'no_priority' ? PRIORITY_META[x.priority].rank : 4;
      return dueRank * 10 + prio;
    };
    const focus = [...mine].sort((a, b) => rank(a) - rank(b)).slice(0, 7);
    const myOverdue = mine.filter((x) => isOpen(x) && dueInfo(x.due_date, now)?.kind === 'overdue').length;
    const myToday = mine.filter((x) => isOpen(x) && dueInfo(x.due_date, now)?.kind === 'today').length;

    const byKind = (kind: string) => open.filter((x) => dueInfo(x.due_date, now)?.kind === kind);
    const groups: DeadlineGroup[] = [
      { key: 'overdue', label: t('groupOverdue'), dot: 'bg-rose-500', items: byKind('overdue') },
      { key: 'today', label: t('groupToday'), dot: 'bg-amber-500', items: byKind('today') },
      { key: 'tomorrow', label: t('groupTomorrow'), dot: 'bg-primary', items: byKind('tomorrow') },
      { key: 'week', label: t('groupThisWeek'), dot: 'bg-emerald-500', items: byKind('week') },
    ].filter((g) => g.items.length > 0);

    const flowFor = (list: Task[]) => statuses.map((s) => ({ key: s.key, name: s.name, color: s.color, count: list.filter((x) => x.status === s.key).length }));
    const flow = flowFor(tasks);

    const momentum: MomentumRow[] = projects.map((p) => {
      const pTasks = tasks.filter((x) => x.project_id === p.id);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        total: pTasks.length,
        done: pTasks.filter((x) => doneKeys.has(x.status)).length,
        overdue: pTasks.filter((x) => isOpen(x) && dueInfo(x.due_date, now)?.kind === 'overdue').length,
        flow: flowFor(pTasks),
      };
    }).sort((a, b) => b.total - a.total).slice(0, 4);

    return { open, doneThisWeek, focus, myOverdue, myToday, groups, flow, momentum };
  }, [tasks, projects, currentUser, doneKeys, statuses, completing, t]);

  const completeTask = useCallback(async (taskId: string) => {
    const doneStatus = statuses.find((s) => s.is_done)?.key || 'done';
    const previous = tasks.find((x) => x.id === taskId);
    setCompleting((s) => new Set(s).add(taskId));
    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, status: doneStatus, completed_at: new Date().toISOString() } : x)));
    const { error: updateError } = await supabase.from('tasks').update({ status: doneStatus, completed_at: new Date().toISOString() }).eq('id', taskId);
    if (updateError) {
      setTasks((prev) => prev.map((x) => (x.id === taskId && previous ? { ...x, status: previous.status, completed_at: previous.completed_at } : x)));
    } else if (previous?.creator?.id && previous.creator.id !== currentUser?.id && currentWorkspace) {
      notifyCollaborationEmail({
        workspaceId: currentWorkspace.id,
        taskId,
        recipientIds: [previous.creator.id],
        kind: 'status',
        taskTitle: previous.title,
        detail: statuses.find((s) => s.is_done)?.name || doneStatus,
      });
    }
    // Hold the ticked row long enough to read the tick, then let it fold away.
    setTimeout(() => setCompleting((s) => { const n = new Set(s); n.delete(taskId); return n; }), 750);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, tasks, currentUser, currentWorkspace]);

  const now = new Date();
  const firstName = currentUser?.full_name?.split(' ')[0] || t('defaultUserName');
  const wsSlug = currentWorkspace?.slug || 'dashboard';
  const tasksLoading = tasksQ.loading || statusesLoading;

  const summary = tasksLoading
    ? t('summaryLoading')
    : derived.myOverdue > 0
      ? t('summaryOverdue').replace('{today}', String(derived.myToday)).replace('{overdue}', String(derived.myOverdue))
      : derived.myToday > 0
        ? t('summaryToday').replace('{today}', String(derived.myToday))
        : t('summaryClear');

  const statusName = (key: string) => statuses.find((s) => s.key === key)?.name;
  const activityItems: ActivityItem[] = activityQ.data.map((a) => ({
    id: a.id,
    name: a.user?.full_name || t('someoneFallback'),
    avatar: a.user?.avatar_url || null,
    action: activityLabel(a, t, statusName),
    resource: a.action === 'member.joined' ? '' : (a.resource_name || ''),
    time: formatRelativeTime(a.created_at, locale),
  }));

  const liveMeetings = meetingsQ.data.filter((m) => m.status === 'live');
  const upcomingMeetings = meetingsQ.data.filter((m) => m.status === 'scheduled');

  const viewAll = (href: string) => (
    <Link href={href} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {t('viewAll')}
      <LinkPendingHint />
    </Link>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <DashboardHero
        workspaceName={currentWorkspace?.name || ''}
        greeting={`${greetingFor(now.getHours(), t)}, ${firstName}`}
        dateLabel={now.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
        summary={summary}
        urgent={!tasksLoading && derived.myOverdue > 0}
        summaryHref={`/${wsSlug}/tasks?mine=1`}
        wsSlug={wsSlug}
        flow={derived.flow}
        flowLoading={tasksLoading}
        stats={[
          { label: t('pulseActiveProjects'), value: projectsQ.loading ? null : projects.length, href: `/${wsSlug}/projects`, icon: FolderKanban },
          { label: t('pulseOpenTasks'), value: tasksLoading ? null : derived.open.length, href: `/${wsSlug}/tasks`, icon: ListTodo },
          { label: t('pulseDoneThisWeek'), value: tasksLoading ? null : derived.doneThisWeek, href: `/${wsSlug}/tasks`, icon: CheckCircle2 },
          { label: t('pulseTeamMembers'), value: membersQ.loading ? null : membersQ.data.count, href: `/${wsSlug}/team`, icon: Users },
        ]}
      />

      <LiveMeetingBanner meetings={liveMeetings} wsSlug={wsSlug} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <SectionCard
            tour="focus"
            order={0}
            title={t('focusTitle')}
            icon={Target}
            subtitle={!tasksLoading && derived.focus.length > 0 ? t('focusSubtitle').replace('{count}', String(derived.focus.length)) : undefined}
            action={viewAll(`/${wsSlug}/tasks?mine=1`)}
            loading={tasksLoading}
            error={tasksQ.error}
            onRetry={tasksQ.reload}
            skeleton={<RowsSkeleton rows={5} tall />}
          >
            <FocusList
              tasks={derived.focus}
              completing={completing}
              onComplete={completeTask}
              onOpen={(id) => setTaskDetailOpen(true, id)}
              wsSlug={wsSlug}
              locale={dateLocale}
            />
          </SectionCard>

          <SectionCard
            tour="momentum"
            order={2}
            title={t('projectsTitle')}
            icon={FolderKanban}
            iconClass="bg-violet-500/12 text-violet-600 dark:text-violet-300"
            subtitle={t('projectsSubtitle')}
            action={viewAll(`/${wsSlug}/projects`)}
            loading={projectsQ.loading || tasksLoading}
            error={projectsQ.error}
            onRetry={projectsQ.reload}
            skeleton={<RowsSkeleton rows={3} tall />}
          >
            <ProjectMomentum rows={derived.momentum} wsSlug={wsSlug} />
          </SectionCard>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <SectionCard
            tour="timeline"
            order={1}
            title={t('timelineTitle')}
            icon={CalendarClock}
            iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            subtitle={t('timelineSubtitle')}
            loading={tasksLoading}
            error={tasksQ.error}
            onRetry={tasksQ.reload}
            skeleton={<RowsSkeleton rows={4} />}
          >
            <DeadlineTimeline groups={derived.groups} onOpen={(id) => setTaskDetailOpen(true, id)} />
          </SectionCard>

          {(meetingsQ.loading || meetingsQ.error || upcomingMeetings.length > 0) && (
            <SectionCard
              order={3}
              title={t('upcomingMeetingsTitle')}
              icon={Video}
              action={viewAll(`/${wsSlug}/meetings`)}
              loading={meetingsQ.loading}
              error={meetingsQ.error}
              onRetry={meetingsQ.reload}
              skeleton={<RowsSkeleton rows={2} />}
            >
              <UpcomingMeetings meetings={upcomingMeetings} wsSlug={wsSlug} locale={dateLocale} />
            </SectionCard>
          )}

          <SectionCard
            tour="activity"
            order={4}
            title={t('activityTitle')}
            icon={Activity}
            iconClass="bg-teal-500/12 text-teal-700 dark:text-teal-300"
            subtitle={t('activitySubtitle')}
            loading={activityQ.loading}
            error={activityQ.error}
            onRetry={activityQ.reload}
            skeleton={<RowsSkeleton rows={4} tall />}
          >
            <ActivityFeed items={activityItems} />
          </SectionCard>

          <SectionCard
            order={5}
            title={t('teamTitle')}
            icon={Users}
            iconClass="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
            subtitle={onlineMembers.length > 0 ? t('onlineCount').replace('{count}', String(onlineMembers.length)) : undefined}
            action={viewAll(`/${wsSlug}/team`)}
            loading={membersQ.loading}
            error={membersQ.error}
            onRetry={membersQ.reload}
            skeleton={<RowsSkeleton rows={2} />}
          >
            <TeamPanel
              online={onlineMembers}
              members={membersQ.data.list.map((m) => ({ id: m.profile?.id || m.role, name: m.profile?.full_name || m.profile?.email || null, avatar: m.profile?.avatar_url || null }))}
              memberCount={membersQ.data.count}
              pageLabel={getPageLabel}
              wsSlug={wsSlug}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
