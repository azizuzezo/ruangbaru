'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, ChevronRight, ArrowRight, Check, Video, Radio } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials, formatRelativeTime } from '@/lib/utils';
import { useTour } from '@/components/tour/TourProvider';
import { JourneyButton } from '@/components/tour/JourneyButton';
import type { Task, Project, ActivityLog, Meeting } from '@/types';

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Member = { role: string; profile: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null };

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-rose-500/10 text-rose-600',
  high: 'bg-orange-500/10 text-orange-600',
  medium: 'bg-amber-500/10 text-amber-600',
  low: 'bg-sky-500/10 text-sky-600',
};

// Realistic demo activity, shown only when the workspace has no real log yet.
const DEMO_ACTIVITY = [
  { who: 'Putri', what: 'menyelesaikan', name: 'Desain halaman onboarding', mins: 8 },
  { who: 'Adi', what: 'mengomentari', name: 'Riset wawancara pengguna', mins: 35 },
  { who: 'Rani', what: 'memindahkan ke Sedang Berjalan', name: 'Spesifikasi kalender', mins: 92 },
  { who: 'Budi', what: 'membuat proyek', name: 'Peluncuran Q3', mins: 180 },
];

function greetingFor(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export default function DashboardPage() {
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  const { maybeAutoStart } = useTour();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const autoStarted = useRef(false);

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
            .select('id,title,status,priority,due_date,assignee_id,project_id,completed_at, assignee:profiles(id,full_name,avatar_url), project:projects(id,name,icon,color)')
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
            .from('activity_log')
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

  // Auto-start the guided tour for first-time users once the dashboard is ready.
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
    const isOpen = (t: Task) => t.status !== 'done' && t.status !== 'cancelled';
    const open = tasks.filter(isOpen);
    const doneThisWeek = tasks.filter((t) => t.status === 'done' && t.completed_at && new Date(t.completed_at) >= weekAgo).length;

    const mine = open.filter((t) => t.assignee_id && currentUser && t.assignee_id === currentUser.id);
    const due = (t: Task) => (t.due_date ? new Date(t.due_date) : null);
    const rank = (t: Task) => {
      const d = due(t);
      if (!d) return 4;
      if (d < todayStart) return 0;          // overdue
      if (d < tomorrowStart) return 1;       // today
      if (d < weekEnd) return 2;             // this week
      return 3;
    };
    const focus = [...mine].sort((a, b) => rank(a) - rank(b)).slice(0, 6);
    const myOverdue = mine.filter((t) => rank(t) === 0).length;
    const myToday = mine.filter((t) => rank(t) === 1).length;

    // Upcoming timeline (whole team), grouped.
    const withDue = open.filter((t) => t.due_date).sort((a, b) => +new Date(a.due_date!) - +new Date(b.due_date!));
    const groups: { label: string; tone: string; items: Task[] }[] = [
      { label: 'Terlewat', tone: 'text-rose-600', items: withDue.filter((t) => new Date(t.due_date!) < todayStart) },
      { label: 'Hari ini', tone: 'text-primary', items: withDue.filter((t) => { const d = new Date(t.due_date!); return d >= todayStart && d < tomorrowStart; }) },
      { label: 'Besok', tone: 'text-amber-600', items: withDue.filter((t) => { const d = new Date(t.due_date!); return d >= tomorrowStart && d < new Date(tomorrowStart.getTime() + 864e5); }) },
      { label: 'Minggu ini', tone: 'text-emerald-600', items: withDue.filter((t) => { const d = new Date(t.due_date!); return d >= new Date(tomorrowStart.getTime() + 864e5) && d < weekEnd; }) },
    ].filter((g) => g.items.length > 0);

    // Project momentum.
    const momentum = projects.map((p) => {
      const pTasks = tasks.filter((t) => t.project_id === p.id);
      const total = pTasks.length;
      const done = pTasks.filter((t) => t.status === 'done').length;
      return { project: p, total, done, pct: total ? Math.round((done / total) * 100) : 0 };
    }).sort((a, b) => b.total - a.total).slice(0, 4);

    return { open, doneThisWeek, focus, myOverdue, myToday, groups, momentum };
  }, [tasks, projects, currentUser, todayStart.getTime()]);

  const completeTask = async (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'done', completed_at: new Date().toISOString() } : t)));
    await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', taskId);
  };

  if (loading) return <DashboardSkeleton />;

  const firstName = currentUser?.full_name?.split(' ')[0] || 'Teman';
  const wsSlug = currentWorkspace?.slug || 'dashboard';
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

  const summary = derived.myOverdue > 0
    ? `${derived.myToday} tugas hari ini · ${derived.myOverdue} terlewat`
    : derived.focus.length > 0
      ? `${derived.myToday} tugas menunggu hari ini`
      : 'Tidak ada tugas mendesak — hari yang tenang. 🎉';

  const pulse = [
    { label: 'Proyek aktif', value: projects.length, tone: 'text-primary' },
    { label: 'Tugas terbuka', value: derived.open.length, tone: 'text-sky-600' },
    { label: 'Selesai minggu ini', value: derived.doneThisWeek, tone: 'text-emerald-600' },
    { label: 'Anggota tim', value: memberCount, tone: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: E }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {greetingFor(now.getHours())}, {firstName}! 👋
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="capitalize">{dateStr}</span> · {summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <JourneyButton />
          <Link href={`/${wsSlug}/tasks`}>
            <Button size="sm" variant="outline-brand" className="gap-1"><Plus className="h-4 w-4" /> Tugas</Button>
          </Link>
          <Link href={`/${wsSlug}/projects`}>
            <Button size="sm" variant="gradient" className="gap-1"><Plus className="h-4 w-4" /> Proyek</Button>
          </Link>
        </div>
      </motion.div>

      {/* ── Workspace pulse ────────────────────────────────────── */}
      <motion.div
        data-tour="pulse"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05, ease: E }}
        className="grid grid-cols-2 divide-y divide-border rounded-2xl border border-border bg-card sm:grid-cols-4 sm:divide-y-0 sm:divide-x"
      >
        {pulse.map((p) => (
          <div key={p.label} className="flex flex-col gap-0.5 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.label}</span>
            <span className={cn('font-display text-2xl font-extrabold tracking-tight', p.tone)}>{p.value}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Meetings (live / upcoming) ─────────────────────────── */}
      {(() => {
        const liveM = meetings.filter((m) => m.status === 'live');
        const upM = meetings.filter((m) => m.status === 'scheduled');
        const shown = [...liveM, ...upM].slice(0, 3);
        if (shown.length === 0) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.07, ease: E }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><Video className="h-4 w-4 text-primary" /> Rapat</h2>
              <Link href={`/${wsSlug}/meetings`}><Button variant="ghost" size="sm" className="gap-1 text-xs">Semua <ChevronRight className="h-3.5 w-3.5" /></Button></Link>
            </div>
            <div className="grid gap-px bg-border sm:grid-cols-3">
              {shown.map((m) => {
                const live = m.status === 'live';
                const when = m.scheduled_at ? new Date(m.scheduled_at) : new Date(m.created_at);
                return (
                  <Link key={m.id} href={`/${wsSlug}/meetings/${m.id}`} className="flex items-center justify-between gap-2 bg-card px-4 py-3 transition-colors hover:bg-accent/40">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{m.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        {live ? (<><Radio className="h-2.5 w-2.5 animate-pulse text-emerald-500" /> <span className="font-semibold text-emerald-600">Sedang berlangsung</span></>)
                          : when.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={cn('shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold', live ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary')}>{live ? 'Gabung' : 'Lihat'}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

      {/* ── Main grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Daily focus */}
          <motion.section
            data-tour="focus"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: E }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-foreground">Fokus Hari Ini</h2>
                <p className="text-[11px] text-muted-foreground">Tugas Anda yang paling perlu diselesaikan.</p>
              </div>
              <Link href={`/${wsSlug}/tasks`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">Semua tugas <ChevronRight className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>
            <div>
              {derived.focus.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-semibold text-foreground">Tidak ada tugas mendesak untuk Anda. 🎉</p>
                  <p className="mt-1 text-xs text-muted-foreground">Nikmati ketenangannya, atau ambil tugas baru dari papan.</p>
                </div>
              ) : (
                <ul>
                  {derived.focus.map((t, i) => {
                    const overdue = t.due_date && new Date(t.due_date) < todayStart;
                    return (
                      <motion.li
                        key={t.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.12 + i * 0.04 }}
                        className="group flex items-center gap-3 border-b border-border px-5 py-3 last:border-0 hover:bg-accent/40"
                      >
                        <button
                          onClick={() => completeTask(t.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-muted-foreground/30 text-transparent transition-all hover:border-emerald-500 hover:text-emerald-500"
                          aria-label="Tandai selesai"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button onClick={() => setTaskDetailOpen(true, t.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-foreground">{t.title}</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              {t.project?.icon && <span>{t.project.icon}</span>}
                              <span className="truncate">{t.project?.name || 'Tanpa proyek'}</span>
                              {t.due_date && (
                                <span className={cn('font-semibold', overdue ? 'text-rose-600' : 'text-muted-foreground')}>
                                  · {overdue ? 'Terlewat' : new Date(t.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </p>
                          </div>
                          {t.priority !== 'no_priority' && (
                            <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase', PRIORITY_STYLES[t.priority])}>{t.priority}</span>
                          )}
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.section>

          {/* Upcoming timeline */}
          <motion.section
            data-tour="timeline"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16, ease: E }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold text-foreground">Linimasa Pekerjaan</h2>
              <p className="text-[11px] text-muted-foreground">Tenggat tim yang akan datang.</p>
            </div>
            <div className="p-5">
              {derived.groups.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Belum ada tugas berjadwal. Tambahkan tenggat agar muncul di sini.</p>
              ) : (
                <div className="space-y-5">
                  {derived.groups.map((g) => (
                    <div key={g.label} className="relative pl-5">
                      <span className={cn('absolute left-0 top-1 h-2 w-2 rounded-full', g.tone.replace('text-', 'bg-'))} />
                      <span className="absolute left-[3px] top-3 h-[calc(100%-4px)] w-px bg-border" />
                      <p className={cn('text-[11px] font-bold uppercase tracking-wider', g.tone)}>{g.label}</p>
                      <ul className="mt-2 space-y-1.5">
                        {g.items.slice(0, 4).map((t) => (
                          <li key={t.id}>
                            <button onClick={() => setTaskDetailOpen(true, t.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{t.title}</span>
                              {t.assignee && (
                                <Avatar className="h-5 w-5"><AvatarImage src={t.assignee.avatar_url || ''} /><AvatarFallback className="text-[8px]">{getInitials(t.assignee.full_name)}</AvatarFallback></Avatar>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Activity feed */}
          <motion.section
            data-tour="activity"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: E }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" /></span>
                Aktivitas Tim
              </h2>
            </div>
            <div className="p-3">
              {activity.length === 0 ? (
                <div>
                  <p className="px-2 pb-2 text-[10px] text-muted-foreground">Belum ada aktivitas — berikut contoh tampilannya.</p>
                  <ul className="space-y-1">
                    {DEMO_ACTIVITY.map((a, i) => (
                      <ActivityRow key={i} name={a.who} action={a.what} resource={a.name} time={`${a.mins} mnt lalu`} avatarUrl={null} />
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="space-y-1">
                  {activity.map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 + i * 0.04 }}>
                      <ActivityRow
                        name={a.user?.full_name || 'Seseorang'}
                        action={a.action}
                        resource={a.resource_name || ''}
                        time={formatRelativeTime(a.created_at)}
                        avatarUrl={a.user?.avatar_url || null}
                      />
                    </motion.div>
                  ))}
                </ul>
              )}
            </div>
          </motion.section>

          {/* Project momentum */}
          <motion.section
            data-tour="momentum"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18, ease: E }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold text-foreground">Momentum Proyek</h2>
              <Link href={`/${wsSlug}/projects`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">Semua <ChevronRight className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>
            <div className="space-y-3 p-4">
              {derived.momentum.length === 0 ? (
                <Link href={`/${wsSlug}/projects`} className="flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-4 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                  Belum ada proyek aktif — buat yang pertama <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                derived.momentum.map((m) => (
                  <Link key={m.project.id} href={`/${wsSlug}/projects/${m.project.id}`} className="block rounded-xl border border-border p-3 transition-all hover:border-primary/40 hover:shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{m.project.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{m.project.name}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">{m.done}/{m.total}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 0.8, ease: E }}
                        className="h-full rounded-full" style={{ background: m.project.color || '#106CD8' }}
                      />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </motion.section>

          {/* Team collaboration */}
          <motion.section
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24, ease: E }}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-bold text-foreground">Tim Anda</h2>
              <Link href={`/${wsSlug}/team`}>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">Kelola <ChevronRight className="h-3.5 w-3.5" /></Button>
              </Link>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex -space-x-2">
                {members.slice(0, 6).map((m, i) => (
                  <Avatar key={i} className="h-9 w-9 border-2 border-card">
                    <AvatarImage src={m.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-[10px]">{getInitials(m.profile?.full_name || m.profile?.email)}</AvatarFallback>
                  </Avatar>
                ))}
                {memberCount > 6 && (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground">+{memberCount - 6}</span>
                )}
              </div>
              <Link href={`/${wsSlug}/team`}>
                <Button size="sm" variant="outline" className="gap-1 text-xs"><Plus className="h-3.5 w-3.5" /> Undang</Button>
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ name, action, resource, time, avatarUrl }: { name: string; action: string; resource: string; time: string; avatarUrl: string | null }) {
  return (
    <li className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/40">
      <Avatar className="mt-0.5 h-6 w-6 shrink-0">
        <AvatarImage src={avatarUrl || ''} />
        <AvatarFallback className="text-[9px]">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-snug text-muted-foreground">
          <span className="font-bold text-foreground">{name}</span> {action}{' '}
          {resource && <span className="font-semibold text-foreground">{resource}</span>}
        </p>
        <p className="mt-0.5 text-[9px] text-muted-foreground/70">{time}</p>
      </div>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-3 w-72 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <div className="h-8 w-28 rounded-full bg-muted/40 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-muted/40 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 p-4"><div className="h-3 w-20 rounded bg-muted/50 animate-pulse" /><div className="h-7 w-10 rounded bg-muted/40 animate-pulse" /></div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 rounded-2xl border border-border bg-card animate-pulse" />
          <div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />
          <div className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
        </div>
      </div>
    </div>
  );
}
