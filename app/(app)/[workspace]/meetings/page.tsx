'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Video, Plus, Clock, Users, Radio, Loader2, CalendarClock, ArrowRight, Link2 } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn, getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Meeting } from '@/types';

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Member = { user_id: string; profile: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null };

export default function MeetingsPage() {
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const router = useRouter();
  const supabase = createClient();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const wsSlug = currentWorkspace?.slug || 'dashboard';

  useEffect(() => {
    if (!currentWorkspace) return;
    const wsId = currentWorkspace.id;
    async function load() {
      try {
        setLoading(true);
        const [mRes, memRes] = await Promise.all([
          supabase.from('meetings').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }).limit(50),
          supabase.from('workspace_members').select('user_id, profile:profiles(id,full_name,avatar_url,email)').eq('workspace_id', wsId).limit(50),
        ]);
        setMeetings((mRes.data as Meeting[]) || []);
        setMembers((memRes.data as unknown as Member[]) || []);
      } catch (err) {
        console.error('Error loading meetings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentWorkspace]);

  const createMeeting = async (opts: { title: string; scheduledAt?: string | null; invitees?: string[] }) => {
    if (!currentWorkspace || !currentUser) return null;
    const room_name = `rb-${crypto.randomUUID()}`;
    const isInstant = !opts.scheduledAt;
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        workspace_id: currentWorkspace.id,
        title: opts.title.trim() || 'Rapat tanpa judul',
        room_name,
        created_by: currentUser.id,
        status: isInstant ? 'live' : 'scheduled',
        scheduled_at: opts.scheduledAt || null,
        started_at: isInstant ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error('Gagal membuat rapat. Pastikan tabel meetings sudah dibuat.');
      return null;
    }
    // Host + invited participants.
    const rows: { meeting_id: string; user_id: string; role: 'host' | 'participant'; invited: boolean }[] = [
      { meeting_id: data.id, user_id: currentUser.id, role: 'host', invited: false },
    ];
    for (const uid of opts.invitees || []) {
      if (uid !== currentUser.id) rows.push({ meeting_id: data.id, user_id: uid, role: 'participant', invited: true });
    }
    await supabase.from('meeting_participants').insert(rows);
    // Best-effort notifications for invitees.
    if (opts.invitees?.length) {
      await supabase.from('notifications').insert(
        opts.invitees.filter((u) => u !== currentUser.id).map((u) => ({
          user_id: u, type: 'mention', title: `Undangan rapat: ${data.title}`,
          body: opts.scheduledAt ? 'Rapat terjadwal' : 'Rapat sedang berlangsung',
          link: `/${wsSlug}/meetings/${data.id}`, actor_id: currentUser.id, workspace_id: currentWorkspace.id,
        })),
      ).then(() => {}, () => {});
    }
    return data as Meeting;
  };

  const startInstant = async () => {
    setStarting(true);
    const m = await createMeeting({ title: `Rapat ${currentUser?.full_name?.split(' ')[0] || ''}`.trim() });
    setStarting(false);
    if (m) router.push(`/${wsSlug}/meetings/${m.id}`);
  };

  const { live, upcoming, past } = useMemo(() => {
    const now = Date.now();
    return {
      live: meetings.filter((m) => m.status === 'live'),
      upcoming: meetings.filter((m) => m.status === 'scheduled' && (!m.scheduled_at || new Date(m.scheduled_at).getTime() >= now - 3600e3))
        .sort((a, b) => (new Date(a.scheduled_at || a.created_at).getTime()) - (new Date(b.scheduled_at || b.created_at).getTime())),
      past: meetings.filter((m) => m.status === 'ended').slice(0, 6),
    };
  }, [meetings]);

  if (loading) return <MeetingsSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: E }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Rapat</h1>
          <p className="mt-1 text-xs text-muted-foreground">Rapat video langsung di dalam RuangBaru — tanpa tautan eksternal.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setScheduleOpen(true)}>
            <CalendarClock className="h-4 w-4" /> Jadwalkan
          </Button>
          <Button size="sm" variant="gradient" className="gap-1.5" onClick={startInstant} disabled={starting}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />} Mulai rapat instan
          </Button>
        </div>
      </motion.div>

      {/* Live */}
      {live.length > 0 && (
        <Section title="Sedang Berlangsung" tone="text-emerald-600">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => <MeetingCard key={m.id} meeting={m} wsSlug={wsSlug} live />)}
          </div>
        </Section>
      )}

      {/* Upcoming */}
      <Section title="Akan Datang" tone="text-primary">
        {upcoming.length === 0 ? (
          <EmptyState onStart={startInstant} onSchedule={() => setScheduleOpen(true)} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => <MeetingCard key={m.id} meeting={m} wsSlug={wsSlug} />)}
          </div>
        )}
      </Section>

      {/* Past */}
      {past.length > 0 && (
        <Section title="Selesai" tone="text-muted-foreground">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((m) => <MeetingCard key={m.id} meeting={m} wsSlug={wsSlug} ended />)}
          </div>
        </Section>
      )}

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        members={members}
        currentUserId={currentUser?.id}
        onCreate={async (vals) => { const m = await createMeeting(vals); if (m) { setScheduleOpen(false); setMeetings((p) => [m, ...p]); toast.success('Rapat dijadwalkan!'); } }}
      />
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className={cn('text-xs font-bold uppercase tracking-wider', tone)}>{title}</h2>
      {children}
    </section>
  );
}

function MeetingCard({ meeting, wsSlug, live, ended }: { meeting: Meeting; wsSlug: string; live?: boolean; ended?: boolean }) {
  const when = meeting.scheduled_at ? new Date(meeting.scheduled_at) : new Date(meeting.created_at);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: E }}
      className={cn('flex flex-col rounded-2xl border border-border bg-card p-4', live && 'border-emerald-500/40')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Video className="h-4 w-4" />
        </div>
        {live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
            <Radio className="h-3 w-3 animate-pulse" /> Langsung
          </span>
        ) : ended ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Selesai</span>
        ) : (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Terjadwal</span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-1 text-sm font-bold text-foreground">{meeting.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        {when.toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
      {!ended && (
        <div className="mt-4 flex items-center gap-2">
          <a href={`/${wsSlug}/meetings/${meeting.id}`} className="flex-1">
            <Button size="sm" variant={live ? 'gradient' : 'outline-brand'} className="w-full gap-1.5">
              {live ? 'Gabung sekarang' : 'Gabung'} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </a>
          <Button
            size="icon" variant="outline" className="h-9 w-9 shrink-0" aria-label="Salin tautan undangan"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/${wsSlug}/meetings/${meeting.id}`);
                toast.success('Tautan rapat disalin — bagikan untuk mengundang.');
              } catch { toast.error('Tidak dapat menyalin tautan.'); }
            }}
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function EmptyState({ onStart, onSchedule }: { onStart: () => void; onSchedule: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Video className="h-6 w-6" /></div>
      <p className="mt-4 text-sm font-bold text-foreground">Belum ada rapat terjadwal</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">Mulai rapat instan untuk berbicara dengan tim sekarang, atau jadwalkan untuk nanti.</p>
      <div className="mt-5 flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onSchedule}><CalendarClock className="h-4 w-4" /> Jadwalkan</Button>
        <Button size="sm" variant="gradient" className="gap-1.5" onClick={onStart}><Video className="h-4 w-4" /> Mulai sekarang</Button>
      </div>
    </div>
  );
}

function ScheduleDialog({ open, onOpenChange, members, currentUserId, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void; members: Member[]; currentUserId?: string;
  onCreate: (vals: { title: string; scheduledAt: string; invitees: string[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [invitees, setInvitees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => setInvitees((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !when) return;
    setSaving(true);
    await onCreate({ title, scheduledAt: new Date(when).toISOString(), invitees });
    setSaving(false);
    setTitle(''); setWhen(''); setInvitees([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jadwalkan rapat</DialogTitle>
          <DialogDescription>Buat rapat terjadwal dan undang anggota tim.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="m-title">Judul</Label>
            <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Standup mingguan" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-when">Waktu</Label>
            <Input id="m-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
          </div>
          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label>Undang anggota</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
                {members.filter((m) => m.profile && m.user_id !== currentUserId).map((m) => {
                  const sel = invitees.includes(m.user_id);
                  return (
                    <button type="button" key={m.user_id} onClick={() => toggle(m.user_id)}
                      className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors', sel ? 'bg-primary/10' : 'hover:bg-accent/50')}>
                      <Avatar className="h-6 w-6"><AvatarImage src={m.profile?.avatar_url || ''} /><AvatarFallback className="text-[9px]">{getInitials(m.profile?.full_name || m.profile?.email)}</AvatarFallback></Avatar>
                      <span className="flex-1 truncate text-xs font-medium text-foreground">{m.profile?.full_name || m.profile?.email}</span>
                      <span className={cn('flex h-4 w-4 items-center justify-center rounded border', sel ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{sel && '✓'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Button type="submit" className="w-full gap-1.5" disabled={saving || !title.trim() || !when}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Jadwalkan rapat
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeetingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
