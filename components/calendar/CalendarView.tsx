'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isSameMonth,
  isToday, format, startOfDay, endOfDay,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock,
  Video, RefreshCw, Link2, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent, CalendarViewMode, EventOccurrence, Profile } from '@/types';
import { expandEvents } from '@/lib/calendar/recurrence';
import {
  fetchEventsInRange, createEvent, updateEvent, deleteEvent, rescheduleEvent,
} from '@/lib/calendar/events';
import { EventDialog, type EventFormValues, type DialogMember, type DialogProject } from './EventDialog';

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];
const HOUR_H = 48; // px per hour in the time grid
const DAY_H = 24 * HOUR_H;
const WEEKDAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface Props {
  workspaceId: string;
  wsSlug: string;
  currentUser: Profile | null;
}

interface DialogState {
  open: boolean;
  mode: 'create' | 'edit';
  event: CalendarEvent | null;
  seedStart: Date | null;
  seedAllDay: boolean;
}

export function CalendarView({ workspaceId, wsSlug, currentUser }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<CalendarViewMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<DialogMember[]>([]);
  const [projects, setProjects] = useState<DialogProject[]>([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [google, setGoogle] = useState<{ configured: boolean; connected: boolean; email?: string | null }>({ configured: false, connected: false });
  const [syncing, setSyncing] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'create', event: null, seedStart: null, seedAllDay: false });

  // Visible window per view (padded for month grid).
  const range = useMemo(() => {
    if (view === 'month') {
      return { start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) };
    }
    if (view === 'week') return { start: startOfWeek(cursor), end: endOfWeek(cursor) };
    if (view === 'day') return { start: startOfDay(cursor), end: endOfDay(cursor) };
    return { start: startOfDay(cursor), end: endOfDay(addDays(cursor, 30)) }; // agenda
  }, [view, cursor]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const data = await fetchEventsInRange(supabase, workspaceId, range.start.toISOString(), range.end.toISOString());
    setEvents(data);
    setLoading(false);
  }, [supabase, workspaceId, range.start, range.end]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Members + projects once per workspace (for the editor).
  useEffect(() => {
    let active = true;
    (async () => {
      const [memRes, projRes] = await Promise.all([
        supabase.from('workspace_members').select('user_id, profile:profiles(id,full_name,avatar_url,email)').eq('workspace_id', workspaceId).limit(100),
        supabase.from('projects').select('id,name,icon,color').eq('workspace_id', workspaceId).eq('status', 'active').limit(100),
      ]);
      if (!active) return;
      setMembers((memRes.data as unknown as DialogMember[]) || []);
      setProjects((projRes.data as unknown as DialogProject[]) || []);
    })();
    return () => { active = false; };
  }, [supabase, workspaceId]);

  // Google sync availability.
  useEffect(() => {
    fetch('/api/google/status').then((r) => r.json()).then(setGoogle).catch(() => {});
  }, []);

  // Realtime: refresh on any calendar_events change in this workspace.
  useEffect(() => {
    const ch = supabase
      .channel(`calendar:${workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `workspace_id=eq.${workspaceId}` }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, workspaceId, loadEvents]);

  const occurrences = useMemo(() => {
    const all = expandEvents(events, range.start, range.end);
    if (!mineOnly || !currentUser) return all;
    return all.filter((o) => o.event.created_by === currentUser.id || (o.event.attendees || []).some((a) => a.user_id === currentUser.id));
  }, [events, range.start, range.end, mineOnly, currentUser]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const go = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setCursor(new Date());
    if (view === 'month') return setCursor((c) => (dir === 1 ? addMonths(c, 1) : subMonths(c, 1)));
    if (view === 'week' || view === 'agenda') return setCursor((c) => (dir === 1 ? addWeeks(c, 1) : subWeeks(c, 1)));
    return setCursor((c) => addDays(c, dir));
  };

  const title = useMemo(() => {
    if (view === 'day') return format(cursor, 'EEEE, d MMMM yyyy');
    if (view === 'week') {
      const s = startOfWeek(cursor); const e = endOfWeek(cursor);
      return `${format(s, 'd MMM')} – ${format(e, 'd MMM yyyy')}`;
    }
    return format(cursor, 'MMMM yyyy');
  }, [view, cursor]);

  // ── CRUD wiring ──────────────────────────────────────────────────────────
  const openCreate = (seedStart: Date | null, seedAllDay = false) =>
    setDialog({ open: true, mode: 'create', event: null, seedStart, seedAllDay });
  const openEdit = (event: CalendarEvent) =>
    setDialog({ open: true, mode: 'edit', event, seedStart: null, seedAllDay: false });

  const handleSave = async (v: EventFormValues) => {
    if (!currentUser) return;
    if (dialog.mode === 'create') {
      let meetingId: string | null = null;
      if (v.enable_meeting) meetingId = await createLinkedMeeting(v.title, v.start_at);
      const created = await createEvent(supabase, {
        workspace_id: workspaceId, project_id: v.project_id, meeting_id: meetingId,
        title: v.title, description: v.description || null, location: v.location || null,
        start_at: v.start_at, end_at: v.end_at, all_day: v.all_day, timezone: v.timezone,
        color: v.color, visibility: v.visibility, recurrence_rule: v.recurrence_rule,
        created_by: currentUser.id,
      }, { attendeeIds: v.attendeeIds, reminderMinutes: v.reminderMinutes });
      if (created) {
        await notifyAttendees(v.attendeeIds, v.title, created.id);
        toast.success('Acara dibuat');
      } else toast.error('Gagal membuat acara. Pastikan migrasi 007 sudah dijalankan.');
    } else if (dialog.event) {
      let meetingId = dialog.event.meeting_id;
      if (v.enable_meeting && !meetingId) meetingId = await createLinkedMeeting(v.title, v.start_at);
      const ok = await updateEvent(supabase, dialog.event.id, {
        title: v.title, description: v.description || null, location: v.location || null,
        start_at: v.start_at, end_at: v.end_at, all_day: v.all_day, timezone: v.timezone,
        color: v.color, visibility: v.visibility, project_id: v.project_id,
        recurrence_rule: v.recurrence_rule, meeting_id: meetingId,
      });
      if (ok) toast.success('Acara diperbarui'); else toast.error('Gagal memperbarui acara');
    }
    setDialog((d) => ({ ...d, open: false }));
    loadEvents();
  };

  const handleDelete = async (event: CalendarEvent) => {
    const ok = await deleteEvent(supabase, event.id);
    if (ok) toast.success('Acara dihapus'); else toast.error('Gagal menghapus');
    setDialog((d) => ({ ...d, open: false }));
    loadEvents();
  };

  // Create a LiveKit-backed meeting linked to this event.
  const createLinkedMeeting = async (title: string, scheduledAt: string): Promise<string | null> => {
    if (!currentUser) return null;
    const { data } = await supabase.from('meetings').insert({
      workspace_id: workspaceId, title: title || 'Rapat', room_name: `rb-${crypto.randomUUID()}`,
      created_by: currentUser.id, status: 'scheduled', scheduled_at: scheduledAt,
    }).select('id').single();
    return data?.id ?? null;
  };

  const notifyAttendees = async (ids: string[], title: string, eventId: string) => {
    if (!currentUser) return;
    const rows = ids.filter((u) => u !== currentUser.id).map((u) => ({
      user_id: u, type: 'mention', title: `Undangan acara: ${title}`, body: 'Anda diundang ke sebuah acara',
      link: `/${wsSlug}/calendar`, actor_id: currentUser.id, workspace_id: workspaceId,
    }));
    if (rows.length) await supabase.from('notifications').insert(rows).then(() => {}, () => {});
  };

  // Drag-to-reschedule (optimistic).
  const moveOccurrence = async (occ: EventOccurrence, newStart: Date) => {
    const durationMs = occ.end.getTime() - occ.start.getTime();
    const newEnd = new Date(newStart.getTime() + durationMs);
    if (occ.event.recurrence_rule) {
      toast.info('Menggeser acara berulang memindahkan seluruh rangkaian.');
    }
    setEvents((prev) => prev.map((e) => e.id === occ.event.id ? { ...e, start_at: newStart.toISOString(), end_at: newEnd.toISOString() } : e));
    const ok = await rescheduleEvent(supabase, occ.event.id, newStart.toISOString(), newEnd.toISOString());
    if (!ok) { toast.error('Gagal memindahkan acara'); loadEvents(); }
  };

  const connectGoogle = () => { window.location.href = `/api/google/connect?returnTo=/${wsSlug}/calendar`; };
  const runGoogleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/google/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId }) });
      const json = await res.json();
      if (res.ok) { toast.success(`Tersinkron: ${json.pulled} masuk, ${json.pushed} keluar`); loadEvents(); }
      else if (json.error === 'not_connected') connectGoogle();
      else toast.error('Sinkronisasi gagal');
    } catch { toast.error('Sinkronisasi gagal'); }
    setSyncing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl capitalize min-w-0 truncate">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => go(-1)} aria-label="Sebelumnya"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-none border-x border-border px-3 text-xs font-semibold" onClick={() => go(0)}>Hari ini</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => go(1)} aria-label="Berikutnya"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <ViewSwitcher view={view} onChange={setView} />
          <button onClick={() => setMineOnly((v) => !v)} className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors', mineOnly ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent/50')}>
            {mineOnly ? 'Acara saya' : 'Semua tim'}
          </button>
          {google.configured && (
            google.connected ? (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={runGoogleSync} disabled={syncing}>
                <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} /> Sinkron Google
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={connectGoogle}>
                <Link2 className="h-3.5 w-3.5" /> Hubungkan Google
              </Button>
            )
          )}
          <Button size="sm" variant="gradient" className="h-8 gap-1.5" onClick={() => openCreate(null)}><Plus className="h-4 w-4" /> Acara</Button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <CalendarSkeleton view={view} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: E }}>
            {view === 'month' && <MonthView cursor={cursor} occurrences={occurrences} onCreate={openCreate} onOpen={openEdit} onMove={moveOccurrence} onMoreClick={(d) => { setCursor(d); setView('day'); }} />}
            {(view === 'week' || view === 'day') && <TimeGridView days={view === 'week' ? eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) }) : [cursor]} occurrences={occurrences} onCreate={openCreate} onOpen={openEdit} onMove={moveOccurrence} />}
            {view === 'agenda' && <AgendaView occurrences={occurrences} onOpen={openEdit} wsSlug={wsSlug} />}
          </motion.div>
        </AnimatePresence>
      )}

      <EventDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        mode={dialog.mode}
        event={dialog.event}
        seedStart={dialog.seedStart}
        seedAllDay={dialog.seedAllDay}
        members={members}
        projects={projects}
        currentUserId={currentUser?.id}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

// ── View switcher ────────────────────────────────────────────────────────────
function ViewSwitcher({ view, onChange }: { view: CalendarViewMode; onChange: (v: CalendarViewMode) => void }) {
  const opts: { v: CalendarViewMode; label: string }[] = [
    { v: 'month', label: 'Bulan' }, { v: 'week', label: 'Minggu' }, { v: 'day', label: 'Hari' }, { v: 'agenda', label: 'Agenda' },
  ];
  return (
    <div className="hidden items-center rounded-lg border border-border p-0.5 sm:flex">
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cn('rounded-md px-2.5 py-1 text-xs font-semibold transition-colors', view === o.v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Month view ───────────────────────────────────────────────────────────────
function MonthView({ cursor, occurrences, onCreate, onOpen, onMove, onMoreClick }: {
  cursor: Date; occurrences: EventOccurrence[];
  onCreate: (d: Date) => void; onOpen: (e: CalendarEvent) => void;
  onMove: (occ: EventOccurrence, newStart: Date) => void; onMoreClick: (d: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
  const dragRef = useRef<EventOccurrence | null>(null);

  const onDrop = (day: Date) => {
    const occ = dragRef.current;
    if (!occ) return;
    const ns = new Date(day);
    ns.setHours(occ.start.getHours(), occ.start.getMinutes(), 0, 0);
    onMove(occ, ns);
    dragRef.current = null;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {WEEKDAY_LABELS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
        {days.map((day) => {
          const dayOccs = occurrences.filter((o) => isSameDay(o.start, day));
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);
          return (
            <div key={day.toISOString()} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(day)}
              onClick={() => onCreate(day)}
              className={cn('group relative flex min-h-[104px] cursor-pointer flex-col gap-1 p-1.5 transition-colors hover:bg-accent/30', !inMonth && 'bg-muted/20')}>
              <div className="flex items-center justify-between">
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold', today ? 'bg-primary text-primary-foreground' : inMonth ? 'text-foreground' : 'text-muted-foreground/50')}>{format(day, 'd')}</span>
                <Plus className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                {dayOccs.slice(0, 3).map((occ) => (
                  <EventChip key={occ.key} occ={occ} onOpen={onOpen} dragRef={dragRef} />
                ))}
                {dayOccs.length > 3 && (
                  <button onClick={(e) => { e.stopPropagation(); onMoreClick(day); }} className="text-left text-[10px] font-semibold text-muted-foreground hover:text-foreground">+{dayOccs.length - 3} lainnya</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventChip({ occ, onOpen, dragRef }: { occ: EventOccurrence; onOpen: (e: CalendarEvent) => void; dragRef: React.MutableRefObject<EventOccurrence | null> }) {
  const { event } = occ;
  return (
    <div
      draggable
      onDragStart={() => { dragRef.current = occ; }}
      onClick={(e) => { e.stopPropagation(); onOpen(event); }}
      className="flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
      style={{ background: event.color }}
      title={event.title}
    >
      {event.meeting_id && <Video className="h-2.5 w-2.5 shrink-0" />}
      {!event.all_day && <span className="opacity-80">{occ.start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  );
}

// ── Time grid (week + day) ─────────────────────────────────────────────────
interface Positioned { occ: EventOccurrence; col: number; cols: number; top: number; height: number; }

function layoutDay(dayOccs: EventOccurrence[]): Positioned[] {
  const timed = dayOccs.filter((o) => !o.event.all_day).sort((a, b) => a.start.getTime() - b.start.getTime());
  const positioned: Positioned[] = [];
  // Greedy column assignment within overlapping clusters.
  let cluster: EventOccurrence[] = [];
  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    const assign = cluster.map((o) => {
      let c = colEnds.findIndex((end) => end <= o.start.getTime());
      if (c === -1) { c = colEnds.length; colEnds.push(0); }
      colEnds[c] = o.end.getTime();
      return { o, c };
    });
    const cols = colEnds.length;
    for (const { o, c } of assign) {
      const top = (o.start.getHours() * 60 + o.start.getMinutes()) / 1440 * DAY_H;
      const dur = Math.max(20, (o.end.getTime() - o.start.getTime()) / 60000);
      positioned.push({ occ: o, col: c, cols, top, height: dur / 1440 * DAY_H });
    }
    cluster = [];
  };
  let clusterEnd = 0;
  for (const o of timed) {
    if (cluster.length && o.start.getTime() >= clusterEnd) flush();
    cluster.push(o);
    clusterEnd = Math.max(clusterEnd, o.end.getTime());
  }
  flush();
  return positioned;
}

function TimeGridView({ days, occurrences, onCreate, onOpen, onMove }: {
  days: Date[]; occurrences: EventOccurrence[];
  onCreate: (d: Date) => void; onOpen: (e: CalendarEvent) => void;
  onMove: (occ: EventOccurrence, newStart: Date) => void;
}) {
  const dragRef = useRef<EventOccurrence | null>(null);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dropAt = (day: Date, e: React.DragEvent<HTMLDivElement>) => {
    const occ = dragRef.current; if (!occ) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let minutes = Math.round((y / DAY_H) * 1440 / 15) * 15;
    minutes = Math.max(0, Math.min(1440 - 15, minutes));
    const ns = new Date(day); ns.setHours(0, 0, 0, 0); ns.setMinutes(minutes);
    onMove(occ, ns);
    dragRef.current = null;
  };

  const clickAt = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = Math.max(0, Math.min(1380, Math.round(((e.clientY - rect.top) / DAY_H) * 1440 / 30) * 30));
    const d = new Date(day); d.setHours(0, 0, 0, 0); d.setMinutes(minutes);
    onCreate(d);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* All-day row */}
      <div className="flex border-b border-border" style={{ paddingLeft: 56 }}>
        <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
          {days.map((day) => {
            const allDay = occurrences.filter((o) => o.event.all_day && o.start <= endOfDay(day) && o.end >= startOfDay(day));
            return (
              <div key={day.toISOString()} className="min-h-[40px] border-l border-border p-1">
                <div className={cn('mb-1 text-center text-[10px] font-bold uppercase', isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
                  {WEEKDAY_LABELS[day.getDay()]} <span className={cn('ml-0.5', isToday(day) && 'rounded-full bg-primary px-1.5 text-primary-foreground')}>{format(day, 'd')}</span>
                </div>
                {allDay.map((o) => (
                  <div key={o.key} onClick={() => onOpen(o.event)} className="mb-0.5 cursor-pointer truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ background: o.event.color }}>{o.event.title}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable time grid */}
      <div className="relative max-h-[600px] overflow-y-auto">
        <div className="flex" style={{ height: DAY_H }}>
          {/* Hour gutter */}
          <div className="relative w-14 shrink-0 border-r border-border">
            {hours.map((h) => (
              <div key={h} className="absolute -translate-y-1/2 px-1.5 text-right text-[9px] font-medium text-muted-foreground" style={{ top: h * HOUR_H, width: 52 }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
          {/* Day columns */}
          <div className="relative grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))` }}>
            {days.map((day) => {
              const positioned = layoutDay(occurrences.filter((o) => isSameDay(o.start, day)));
              return (
                <div key={day.toISOString()} className="relative border-l border-border" onDragOver={(e) => e.preventDefault()} onDrop={(e) => dropAt(day, e)} onClick={(e) => clickAt(day, e)}>
                  {/* Hour lines */}
                  {hours.map((h) => <div key={h} className="absolute left-0 right-0 border-t border-border/60" style={{ top: h * HOUR_H }} />)}
                  {/* Now line */}
                  {isToday(day) && <NowLine />}
                  {/* Events */}
                  {positioned.map(({ occ, col, cols, top, height }) => (
                    <div
                      key={occ.key} draggable
                      onDragStart={(e) => { e.stopPropagation(); dragRef.current = occ; }}
                      onClick={(e) => { e.stopPropagation(); onOpen(occ.event); }}
                      className="absolute overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm transition-transform hover:z-10 hover:scale-[1.01] active:scale-95"
                      style={{ top, height: Math.max(18, height - 2), left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`, background: occ.event.color, borderColor: 'rgba(0,0,0,0.2)' }}
                      title={occ.event.title}
                    >
                      <div className="flex items-center gap-1 truncate">{occ.event.meeting_id && <Video className="h-2.5 w-2.5 shrink-0" />}<span className="truncate">{occ.event.title}</span></div>
                      <div className="opacity-80">{occ.start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NowLine() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const top = (now.getHours() * 60 + now.getMinutes()) / 1440 * DAY_H;
  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top }}>
      <div className="h-2 w-2 rounded-full bg-rose-500" />
      <div className="h-px flex-1 bg-rose-500" />
    </div>
  );
}

// ── Agenda view ──────────────────────────────────────────────────────────────
function AgendaView({ occurrences, onOpen, wsSlug }: { occurrences: EventOccurrence[]; onOpen: (e: CalendarEvent) => void; wsSlug: string }) {
  const groups = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    for (const o of occurrences) {
      const key = format(o.start, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries());
  }, [occurrences]);

  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalIcon className="h-6 w-6" /></div>
        <p className="mt-4 text-sm font-bold text-foreground">Tidak ada acara 30 hari ke depan</p>
        <p className="mt-1 text-xs text-muted-foreground">Buat acara untuk mulai mengisi agenda tim.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([key, occs]) => {
        const d = new Date(key);
        return (
          <div key={key} className="flex gap-3">
            <div className="w-14 shrink-0 text-right">
              <div className={cn('text-2xl font-extrabold', isToday(d) ? 'text-primary' : 'text-foreground')}>{format(d, 'd')}</div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">{format(d, 'EEE')}</div>
            </div>
            <div className="flex-1 space-y-1.5">
              {occs.map((o) => (
                <button key={o.key} onClick={() => onOpen(o.event)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-accent/40">
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: o.event.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{o.event.title}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {o.event.all_day ? 'Sepanjang hari' : `${o.start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} – ${o.end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  {o.event.meeting_id && (
                    <a href={`/${wsSlug}/meetings/${o.event.meeting_id}`} onClick={(e) => e.stopPropagation()} className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">Gabung</a>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function CalendarSkeleton({ view }: { view: CalendarViewMode }) {
  if (view === 'agenda') {
    return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />)}</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 py-2">{WEEKDAY_LABELS.map((d) => <div key={d} className="text-center text-[10px] font-bold uppercase text-muted-foreground">{d}</div>)}</div>
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
        {[...Array(35)].map((_, i) => <div key={i} className="min-h-[104px] p-1.5"><div className="h-6 w-6 rounded-full bg-muted/50 animate-pulse" /></div>)}
      </div>
    </div>
  );
}

export default CalendarView;
