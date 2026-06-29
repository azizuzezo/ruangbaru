'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Trash2, Video, MapPin, Bell, Repeat, Users as UsersIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import type { CalendarEvent, EventRecurrence, Workspace, Profile } from '@/types';

export type DialogMember = { user_id: string; profile: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null };

const COLORS = ['#106CD8', '#10B29F', '#FDB31A', '#8B5CF6', '#EF4444', '#10B981'];
const REMINDERS = [
  { label: 'Tanpa pengingat', value: '' },
  { label: '5 menit sebelum', value: '5' },
  { label: '10 menit sebelum', value: '10' },
  { label: '15 menit sebelum', value: '15' },
  { label: '30 menit sebelum', value: '30' },
  { label: '1 jam sebelum', value: '60' },
];
const RECURRENCE: { label: string; value: EventRecurrence }[] = [
  { label: 'Tidak berulang', value: 'none' },
  { label: 'Harian', value: 'daily' },
  { label: 'Mingguan', value: 'weekly' },
  { label: 'Bulanan', value: 'monthly' },
];

const toInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

export function EventDialog({
  open, onOpenChange, workspace, currentUser, members, event, initialDate, onSaved, onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspace: Workspace;
  currentUser: Profile;
  members: DialogMember[];
  event?: CalendarEvent | null;
  initialDate?: Date;
  onSaved: (e: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const supabase = createClient();
  const isEdit = !!event;

  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [recurrence, setRecurrence] = useState<EventRecurrence>('none');
  const [until, setUntil] = useState('');
  const [reminder, setReminder] = useState('');
  const [enableMeeting, setEnableMeeting] = useState(false);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Hydrate from the event being edited, or sensible defaults for a new one.
  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setStart(toInput(event.start_at));
      setEnd(toInput(event.end_at));
      setAllDay(event.all_day);
      setLocation(event.location || '');
      setDescription(event.description || '');
      setColor(event.color || COLORS[0]);
      setRecurrence(event.recurrence);
      setUntil(event.recurrence_until || '');
      setReminder(event.reminder_minutes ? String(event.reminder_minutes) : '');
      setEnableMeeting(!!event.meeting_id);
      setInvitees((event.attendees || []).map((a) => a.user_id));
    } else {
      const base = initialDate ? new Date(initialDate) : new Date();
      if (!initialDate) base.setMinutes(0, 0, 0);
      base.setHours(base.getHours() + (initialDate ? 9 : 1)); // default morning slot for clicked day
      const startD = initialDate ? new Date(new Date(initialDate).setHours(9, 0, 0, 0)) : new Date(Math.ceil(Date.now() / 36e5) * 36e5);
      const endD = new Date(startD.getTime() + 36e5);
      setTitle(''); setStart(toInput(startD.toISOString())); setEnd(toInput(endD.toISOString()));
      setAllDay(false); setLocation(''); setDescription(''); setColor(COLORS[0]);
      setRecurrence('none'); setUntil(''); setReminder(''); setEnableMeeting(false); setInvitees([]);
    }
  }, [open, event, initialDate]);

  const toggleInvite = (id: string) => setInvitees((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !start || !end) return;
    setSaving(true);
    try {
      const startIso = new Date(start).toISOString();
      const endIso = new Date(end).toISOString();

      // Ensure a linked meeting exists if requested.
      let meetingId = event?.meeting_id || null;
      if (enableMeeting && !meetingId) {
        const { data: m } = await supabase.from('meetings').insert({
          workspace_id: workspace.id, title: title.trim(), room_name: `rb-${crypto.randomUUID()}`,
          created_by: currentUser.id, status: 'scheduled', scheduled_at: startIso,
        }).select('id').single();
        meetingId = m?.id || null;
        if (meetingId) await supabase.from('meeting_participants').insert({ meeting_id: meetingId, user_id: currentUser.id, role: 'host', invited: false });
      } else if (!enableMeeting) {
        meetingId = null;
      }

      const payload = {
        workspace_id: workspace.id,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        color,
        start_at: startIso,
        end_at: endIso,
        all_day: allDay,
        recurrence,
        recurrence_until: recurrence !== 'none' && until ? until : null,
        reminder_minutes: reminder ? parseInt(reminder, 10) : null,
        meeting_id: meetingId,
        created_by: currentUser.id,
      };

      let saved: CalendarEvent | null = null;
      if (isEdit && event) {
        const { data, error } = await supabase.from('events').update(payload).eq('id', event.id).select().single();
        if (error) throw error;
        saved = data as CalendarEvent;
        await supabase.from('event_attendees').delete().eq('event_id', event.id);
      } else {
        const { data, error } = await supabase.from('events').insert(payload).select().single();
        if (error) throw error;
        saved = data as CalendarEvent;
      }

      // Attendees + notifications.
      if (saved && invitees.length) {
        await supabase.from('event_attendees').insert(invitees.map((u) => ({ event_id: saved!.id, user_id: u, status: 'invited' as const })));
        const others = invitees.filter((u) => u !== currentUser.id);
        if (others.length) {
          await supabase.from('notifications').insert(others.map((u) => ({
            user_id: u, type: 'mention', title: `Undangan acara: ${saved!.title}`,
            body: format(new Date(startIso), 'd MMM yyyy, HH:mm'),
            link: `/${workspace.slug}/calendar`, actor_id: currentUser.id, workspace_id: workspace.id,
          }))).then(() => {}, () => {});
        }
      }

      saved!.attendees = invitees.map((u) => ({ id: '', event_id: saved!.id, user_id: u, status: 'invited' as const }));
      onSaved(saved!);
      onOpenChange(false);
      toast.success(isEdit ? 'Acara diperbarui' : 'Acara dibuat');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan acara. Pastikan tabel events sudah dibuat.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    setDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', event.id);
    setDeleting(false);
    if (error) { toast.error('Gagal menghapus acara'); return; }
    onDeleted(event.id);
    onOpenChange(false);
    toast.success('Acara dihapus');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit acara' : 'Acara baru'}</DialogTitle>
          <DialogDescription>Jadwalkan acara tim dan undang anggota.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Judul</Label>
            <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Rapat mingguan tim" required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Mulai</Label>
              <Input id="ev-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">Selesai</Label>
              <Input id="ev-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Toggle active={allDay} onClick={() => setAllDay((v) => !v)}>Sepanjang hari</Toggle>
            <Toggle active={enableMeeting} onClick={() => setEnableMeeting((v) => !v)}>
              <Video className="h-3.5 w-3.5" /> Aktifkan rapat video
            </Toggle>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Warna</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('h-7 w-7 rounded-full transition-transform', color === c ? 'ring-2 ring-offset-2 ring-foreground/30 scale-110' : 'hover:scale-105')}
                  style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" /> Pengulangan</Label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                {RECURRENCE.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Bell className="h-3.5 w-3.5" /> Pengingat</Label>
              <select value={reminder} onChange={(e) => setReminder(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                {REMINDERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {recurrence !== 'none' && (
            <div className="space-y-1.5">
              <Label htmlFor="ev-until">Berulang hingga (opsional)</Label>
              <Input id="ev-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ev-loc" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Lokasi (opsional)</Label>
            <Input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="cth. Ruang rapat / online" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Catatan (opsional)</Label>
            <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Agenda, tautan, atau detail lain" />
          </div>

          {/* Invitees */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><UsersIcon className="h-3.5 w-3.5" /> Undang anggota</Label>
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
                {members.filter((m) => m.profile && m.user_id !== currentUser.id).map((m) => {
                  const sel = invitees.includes(m.user_id);
                  return (
                    <button type="button" key={m.user_id} onClick={() => toggleInvite(m.user_id)}
                      className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors', sel ? 'bg-primary/10' : 'hover:bg-accent/50')}>
                      <Avatar className="h-6 w-6"><AvatarImage src={m.profile?.avatar_url || ''} /><AvatarFallback className="text-[9px]">{getInitials(m.profile?.full_name || m.profile?.email)}</AvatarFallback></Avatar>
                      <span className="flex-1 truncate text-xs font-medium text-foreground">{m.profile?.full_name || m.profile?.email}</span>
                      <span className={cn('flex h-4 w-4 items-center justify-center rounded border text-[9px]', sel ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{sel && '✓'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            {isEdit ? (
              <Button type="button" variant="ghost" onClick={remove} disabled={deleting} className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus
              </Button>
            ) : <span />}
            <Button type="submit" disabled={saving || !title.trim()} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {isEdit ? 'Simpan' : 'Buat acara'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent/50')}>
      {children}
    </button>
  );
}
