'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  format, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, addDays,
  isSameDay, isSameMonth, isToday, addMonths, subMonths, differenceInCalendarDays,
} from 'date-fns';
import {
  ChevronLeft, ChevronRight, Plus, Video, CalendarDays, RefreshCw, X,
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EventDialog, type DialogMember } from '@/components/calendar/EventDialog';
import type { CalendarEvent, Task } from '@/types';

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];
const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

type Occurrence = { key: string; event: CalendarEvent; date: Date };

function occurrencesInRange(ev: CalendarEvent, rangeStart: Date, rangeEnd: Date): Date[] {
  const base = new Date(ev.start_at);
  if (ev.recurrence === 'none') {
    return base >= rangeStart && base <= rangeEnd ? [base] : [];
  }
  const out: Date[] = [];
  const until = ev.recurrence_until ? new Date(ev.recurrence_until + 'T23:59:59') : rangeEnd;
  const hardEnd = until < rangeEnd ? until : rangeEnd;
  let cur = new Date(base);
  let guard = 0;
  while (cur <= hardEnd && guard < 500) {
    if (cur >= rangeStart) out.push(new Date(cur));
    if (ev.recurrence === 'daily') cur = addDays(cur, 1);
    else if (ev.recurrence === 'weekly') cur = addDays(cur, 7);
    else { cur = new Date(cur); cur.setMonth(cur.getMonth() + 1); }
    guard++;
  }
  return out;
}

// Daftar Hari Libur Nasional Indonesia 2026
const INDONESIAN_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': 'Tahun Baru 2026',
  '2026-02-17': 'Isra Mikraj',
  '2026-02-18': 'Tahun Baru Imlek',
  '2026-03-29': 'Hari Suci Nyepi',
  '2026-04-03': 'Wafat Isa Almasih',
  '2026-04-05': 'Hari Paskah',
  '2026-04-20': 'Idul Fitri 1447 H',
  '2026-04-21': 'Idul Fitri 1447 H',
  '2026-05-01': 'Hari Buruh',
  '2026-05-14': 'Kenaikan Isa Almasih',
  '2026-05-27': 'Hari Raya Waisak',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-27': 'Idul Adha 1447 H',
  '2026-07-17': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Proklamasi Kemerdekaan RI',
  '2026-09-26': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Hari Raya Natal',
};

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export default function CalendarPage() {
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  const supabase = createClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<DialogMember[]>([]);
  const [showTasks, setShowTasks] = useState(true);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);
  const [activeDrag, setActiveDrag] = useState<Occurrence | null>(null);
  const [googleConn, setGoogleConn] = useState<{ google_email: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const wsSlug = currentWorkspace?.slug || 'dashboard';

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    async function load() {
      try {
        setLoading(true);
        const [evRes, taskRes, memRes] = await Promise.all([
          supabase.from('events').select('*, attendees:event_attendees(user_id,status), meeting:meetings(id,room_name,status)').eq('workspace_id', wsId).limit(500),
          supabase.from('tasks').select('id,title,due_date, project:projects(name,icon)').eq('workspace_id', wsId).not('due_date', 'is', null).limit(300),
          supabase.from('workspace_members').select('user_id, profile:profiles(id,full_name,avatar_url,email)').eq('workspace_id', wsId).limit(50),
        ]);
        setEvents((evRes.data as unknown as CalendarEvent[]) || []);
        setTasks((taskRes.data as unknown as Task[]) || []);
        setMembers((memRes.data as unknown as DialogMember[]) || []);
      } catch (err) {
        console.error('Error loading calendar:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentWorkspace]);

  // Google connection state.
  useEffect(() => {
    if (!currentWorkspace || !currentUser) return;
    supabase.from('google_calendar_connections').select('google_email,last_synced_at')
      .eq('user_id', currentUser.id).eq('workspace_id', currentWorkspace.id).maybeSingle()
      .then((res: { data: { google_email: string | null } | null }) => {
        setGoogleConn(res.data ? { google_email: res.data.google_email } : null);
      });
  }, [currentWorkspace, currentUser]);

  // Surface the OAuth redirect result (one-time), then clean the URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('google');
    if (!p) return;
    const map: Record<string, string> = {
      connected: 'Google Calendar tersambung! Klik Sinkronkan untuk memuat acara.',
      not_configured: 'Google Calendar belum dikonfigurasi (butuh kunci OAuth).',
      denied: 'Koneksi Google dibatalkan.',
      error: 'Gagal menyambungkan Google Calendar.',
    };
    if (map[p]) (p === 'connected' ? toast.success : toast.error)(map[p]);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const reloadEvents = async () => {
    if (!currentWorkspace) return;
    const { data } = await supabase.from('events')
      .select('*, attendees:event_attendees(user_id,status), meeting:meetings(id,room_name,status)')
      .eq('workspace_id', currentWorkspace.id).limit(500);
    setEvents((data as unknown as CalendarEvent[]) || []);
  };

  const handleSync = async () => {
    if (!currentWorkspace) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/google/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error === 'reconnect_required' ? 'Sesi Google kedaluwarsa — sambungkan ulang.' : 'Gagal menyinkronkan.');
      } else {
        toast.success(`Tersinkron: ${data.pulled} masuk, ${data.pushed} terkirim.`);
        await reloadEvents();
      }
    } catch { toast.error('Gagal menyinkronkan.'); }
    finally { setSyncing(false); }
  };

  const disconnectGoogle = async () => {
    if (!currentWorkspace || !currentUser) return;
    await supabase.from('google_calendar_connections').delete().eq('user_id', currentUser.id).eq('workspace_id', currentWorkspace.id);
    setGoogleConn(null);
    toast.success('Google Calendar diputus.');
  };

  // Visible grid: 6 weeks starting on the Sunday of the month's first week.
  const gridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });

  const occByDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    const rStart = gridStart;
    const rEnd = addDays(gridStart, 41);
    for (const ev of events) {
      for (const d of occurrencesInRange(ev, rStart, rEnd)) {
        const key = format(d, 'yyyy-MM-dd');
        const arr = map.get(key) || [];
        arr.push({ key: `${ev.id}::${key}`, event: ev, date: d });
        map.set(key, arr);
      }
    }
    return map;
  }, [events, gridStart]);

  const openCreate = (day: Date) => { setEditing(null); setCreateDate(day); setDialogOpen(true); };
  const openEdit = (ev: CalendarEvent) => { setCreateDate(null); setEditing(ev); setDialogOpen(true); };

  const onSaved = (e: CalendarEvent) => setEvents((prev) => { const i = prev.findIndex((x) => x.id === e.id); if (i >= 0) { const c = [...prev]; c[i] = { ...c[i], ...e }; return c; } return [...prev, e]; });
  const onDeleted = (id: string) => setEvents((prev) => prev.filter((e) => e.id !== id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDrag(null);
    const occ = activeDrag;
    if (!occ || !e.over) return;
    const targetKey = String(e.over.id);
    const targetDay = new Date(targetKey + 'T00:00:00');
    const delta = differenceInCalendarDays(targetDay, occ.date);
    if (delta === 0) return;
    if (occ.event.recurrence !== 'none') { toast.info('Acara berulang tidak bisa diseret. Buka untuk mengedit.'); return; }
    const ev = occ.event;
    const newStart = new Date(new Date(ev.start_at).getTime() + delta * 864e5).toISOString();
    const newEnd = new Date(new Date(ev.end_at).getTime() + delta * 864e5).toISOString();
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, start_at: newStart, end_at: newEnd } : x)));
    const { error } = await supabase.from('events').update({ start_at: newStart, end_at: newEnd }).eq('id', ev.id);
    if (error) toast.error('Gagal memindahkan acara');
  };

  if (loading) return <CalendarSkeleton />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: E }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl capitalize">{format(currentDate, 'MMMM yyyy')}</h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentDate(new Date())}>Hari ini</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            {(['month', 'agenda'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn('rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors', view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {v === 'month' ? 'Bulan' : 'Agenda'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowTasks((s) => !s)}
            className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors', showTasks ? 'border-primary/40 bg-primary/5 text-primary' : 'border-border text-muted-foreground')}>
            Tugas
          </button>

          {/* Google Calendar */}
          {googleConn ? (
            <div className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 py-0.5 pl-2.5 pr-1">
              <span className="hidden text-[11px] font-semibold text-emerald-700 sm:inline" title={googleConn.google_email || ''}>Google ✓</span>
              <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} /> Sinkronkan
              </Button>
              <button onClick={disconnectGoogle} aria-label="Putuskan Google" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <a href={`/api/google/connect?workspace=${wsSlug}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <CalendarDays className="h-4 w-4" /> Sambungkan Google
              </Button>
            </a>
          )}

          <Button size="sm" variant="gradient" className="gap-1.5" style={{ background: '#106CD8' }} onClick={() => openCreate(new Date())}><Plus className="h-4 w-4" /> Acara</Button>
        </div>
      </motion.div>

      {view === 'month' ? (
        <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => {
          const id = String(e.active.id); const [evId, dayKey] = id.split('::');
          const ev = events.find((x) => x.id === evId); if (ev) setActiveDrag({ key: id, event: ev, date: new Date(dayKey + 'T00:00:00') });
        }} onDragEnd={handleDragEnd}>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* Day of Week Header */}
            <div className="grid grid-cols-7 border-b border-border bg-neutral-50/70 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              {DOW.map((d, i) => (
                <div key={d} className={cn(i === 0 && 'text-red-500', i === 6 && 'text-neutral-600')}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {gridDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const occ = occByDay.get(key) || [];
                const dayTasks = showTasks ? tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day)) : [];
                const holiday = INDONESIAN_HOLIDAYS_2026[key];
                const weekend = isWeekend(day);
                
                return (
                  <DayCell 
                    key={key} 
                    dayKey={key} 
                    inMonth={isSameMonth(day, currentDate)} 
                    today={isToday(day)} 
                    weekend={weekend}
                    onCreate={() => openCreate(day)}
                  >
                    {/* Day number absolutely positioned */}
                    <span className={cn(
                      'absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold z-10 transition-colors',
                      isToday(day) 
                        ? 'bg-[#106CD8] text-white' 
                        : holiday || day.getDay() === 0 
                          ? 'text-red-500' 
                          : 'text-neutral-700'
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Events / Tasks container */}
                    <div className="flex flex-1 flex-col gap-1 overflow-hidden pr-6">
                      {/* Holiday indicator */}
                      {holiday && (
                        <span className="mb-0.5 truncate rounded bg-red-50/70 px-1.5 py-0.5 text-[8px] font-bold text-red-600 leading-tight border border-red-100/60 max-w-full" title={holiday}>
                          {holiday}
                        </span>
                      )}
                      
                      {occ.slice(0, 3).map((o) => <EventChip key={o.key} occ={o} onClick={() => openEdit(o.event)} />)}
                      {occ.length > 3 && <span className="px-1 text-[9px] font-bold text-neutral-400">+{occ.length - 3} lagi</span>}
                      {dayTasks.slice(0, 2).map((t) => (
                        <button key={t.id} onClick={(e) => { e.stopPropagation(); setTaskDetailOpen(true, t.id); }}
                          className="truncate rounded border border-dashed border-amber-350 bg-amber-50/60 px-1 py-0.5 text-left text-[9px] font-bold text-amber-700 hover:bg-amber-100/70 transition-colors">
                          {t.project?.icon} {t.title}
                        </button>
                      ))}
                    </div>
                  </DayCell>
                );
              })}
            </div>
          </div>
          <DragOverlay>{activeDrag && <div className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg" style={{ background: activeDrag.event.color }}>{activeDrag.event.title}</div>}</DragOverlay>
        </DndContext>
      ) : (
        <AgendaView events={events} wsSlug={wsSlug} onEdit={openEdit} />
      )}

      {currentWorkspace && currentUser && (
        <EventDialog
          open={dialogOpen} onOpenChange={setDialogOpen}
          workspace={currentWorkspace} currentUser={currentUser} members={members}
          event={editing} initialDate={createDate || undefined}
          onSaved={onSaved} onDeleted={onDeleted}
          onTaskSaved={(newTask) => {
            setTasks((prev) => {
              const exists = prev.some((t) => t.id === newTask.id);
              if (exists) {
                return prev.map((t) => (t.id === newTask.id ? newTask : t));
              }
              return [...prev, newTask];
            });
          }}
        />
      )}
    </div>
  );
}

function DayCell({ dayKey, inMonth, today, weekend, onCreate, children }: { 
  dayKey: string; inMonth: boolean; today: boolean; weekend: boolean; onCreate: () => void; children: React.ReactNode 
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });
  return (
    <div ref={setNodeRef} onClick={onCreate}
      className={cn(
        'group relative flex min-h-[96px] cursor-pointer flex-col border-b border-r border-neutral-200/60 p-1.5 transition-all duration-150',
        !inMonth && 'opacity-35 bg-neutral-50/20', 
        weekend && inMonth && 'bg-neutral-50/30',
        today && 'bg-[#106CD8]/[0.03] ring-1 ring-inset ring-[#106CD8]/10', 
        isOver && 'bg-[#106CD8]/10 ring-1 ring-inset ring-[#106CD8]/30'
      )}>
      {children}
      <span className="mt-auto hidden items-center gap-0.5 self-start text-[9px] font-medium text-[#106CD8]/0 group-hover:flex group-hover:text-[#106CD8]"><Plus className="h-2.5 w-2.5" /></span>
    </div>
  );
}

function EventChip({ occ, onClick }: { occ: Occurrence; onClick: () => void }) {
  const draggable = occ.event.recurrence === 'none';
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: occ.key, disabled: !draggable });
  const ev = occ.event;
  const hasMeeting = ev.meeting_id && ev.meeting?.status !== 'ended';
  return (
    <button
      ref={setNodeRef} {...(draggable ? { ...listeners, ...attributes } : {})}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn('flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold transition-opacity', isDragging && 'opacity-40')}
      style={{ background: `${ev.color}1A`, color: ev.color }}
      title={ev.title}
    >
      {hasMeeting && <Video className="h-2.5 w-2.5 shrink-0" />}
      {!ev.all_day && <span className="shrink-0 opacity-70">{format(new Date(ev.start_at), 'HH:mm')}</span>}
      <span className="truncate">{ev.title}</span>
    </button>
  );
}

function AgendaView({ events, wsSlug, onEdit }: { events: CalendarEvent[]; wsSlug: string; onEdit: (e: CalendarEvent) => void }) {
  const now = new Date();
  const horizon = addDays(now, 60);
  const occ: Occurrence[] = [];
  for (const ev of events) for (const d of occurrencesInRange(ev, now, horizon)) occ.push({ key: `${ev.id}::${format(d, 'yyyy-MM-dd')}`, event: ev, date: d });
  occ.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (occ.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarDays className="h-6 w-6" /></div>
        <p className="mt-4 text-sm font-bold text-foreground">Belum ada acara mendatang</p>
        <p className="mt-1 text-xs text-muted-foreground">Buat acara untuk mengisi agenda tim Anda.</p>
      </div>
    );
  }

  // Group by day.
  const groups = new Map<string, Occurrence[]>();
  for (const o of occ) { const k = format(o.date, 'yyyy-MM-dd'); groups.set(k, [...(groups.get(k) || []), o]); }

  return (
    <div className="space-y-4">
      {[...groups.entries()].slice(0, 30).map(([k, items]) => {
        const d = new Date(k + 'T00:00:00');
        return (
          <div key={k} className="flex gap-4">
            <div className="w-14 shrink-0 text-right">
              <p className={cn('text-xs font-bold', isToday(d) ? 'text-primary' : 'text-foreground')}>{format(d, 'EEE')}</p>
              <p className={cn('font-display text-xl font-extrabold', isToday(d) ? 'text-primary' : 'text-foreground')}>{format(d, 'd')}</p>
            </div>
            <div className="flex-1 space-y-2 border-l border-border pl-4">
              {items.map((o) => {
                const ev = o.event;
                const hasMeeting = ev.meeting_id && ev.meeting?.status !== 'ended';
                return (
                  <div key={o.key} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <span className="h-8 w-1 rounded-full" style={{ background: ev.color }} />
                    <button onClick={() => onEdit(ev)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-bold text-foreground">{ev.title}</p>
                      <p className="text-[11px] text-muted-foreground">{ev.all_day ? 'Sepanjang hari' : `${format(new Date(ev.start_at), 'HH:mm')} – ${format(new Date(ev.end_at), 'HH:mm')}`}{ev.location ? ` · ${ev.location}` : ''}</p>
                    </button>
                    {hasMeeting && (
                      <Link href={`/${wsSlug}/meetings/${ev.meeting_id}`}>
                        <Button size="sm" variant="outline-brand" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Gabung</Button>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      {/* Month/Agenda toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border bg-muted/20 py-2.5">
          {DOW.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="min-h-[96px] border-b border-r border-border p-2 last:border-r-0">
              <Skeleton className="ml-auto h-5 w-5 rounded-full mb-1.5" />
              {i % 5 === 0 && <Skeleton className="h-5 w-full rounded mb-1" />}
              {i % 7 === 2 && <Skeleton className="h-5 w-3/4 rounded" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
