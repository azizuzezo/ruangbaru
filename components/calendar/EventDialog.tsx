'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2, MapPin, Users, Bell, Repeat, Globe, Palette, Lock, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import type { CalendarEvent, EventVisibility } from '@/types';
import { RECURRENCE_PRESETS } from '@/lib/calendar/recurrence';
import { TIMEZONE_OPTIONS, browserTimezone, utcISOToZonedInput, zonedInputToUtcISO } from '@/lib/calendar/tz';

export const EVENT_COLORS = [
  '#106CD8', '#10B29F', '#FDB31A', '#F43F5E',
  '#8B5CF6', '#10B981', '#F97316', '#64748B',
];

const REMINDER_OPTIONS = [
  { label: 'Saat mulai', value: 0 },
  { label: '5 menit', value: 5 },
  { label: '10 menit', value: 10 },
  { label: '30 menit', value: 30 },
  { label: '1 jam', value: 60 },
  { label: '1 hari', value: 1440 },
];

export type DialogMember = {
  user_id: string;
  profile: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null;
};
export type DialogProject = { id: string; name: string; icon: string; color: string };

export interface EventFormValues {
  title: string;
  description: string;
  location: string;
  start_at: string; // UTC ISO
  end_at: string; // UTC ISO
  all_day: boolean;
  timezone: string;
  color: string;
  visibility: EventVisibility;
  project_id: string | null;
  recurrence_rule: string | null;
  enable_meeting: boolean;
  attendeeIds: string[];
  reminderMinutes: number[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  /** For create: seed start/end. For edit: the event being edited. */
  event?: CalendarEvent | null;
  seedStart?: Date | null;
  seedAllDay?: boolean;
  members: DialogMember[];
  projects: DialogProject[];
  currentUserId?: string;
  onSave: (values: EventFormValues) => Promise<void>;
  onDelete?: (event: CalendarEvent) => Promise<void>;
}

function roundedNow(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

export function EventDialog({
  open, onOpenChange, mode, event, seedStart, seedAllDay,
  members, projects, currentUserId, onSave, onDelete,
}: Props) {
  const [tz, setTz] = useState(browserTimezone());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [visibility, setVisibility] = useState<EventVisibility>('workspace');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [enableMeeting, setEnableMeeting] = useState(false);
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [reminders, setReminders] = useState<number[]>([10]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Hydrate the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && event) {
      const zone = event.timezone || browserTimezone();
      setTz(zone);
      setTitle(event.title);
      setDescription(event.description || '');
      setLocation(event.location || '');
      setAllDay(event.all_day);
      setStartInput(utcISOToZonedInput(event.start_at, zone));
      setEndInput(utcISOToZonedInput(event.end_at, zone));
      setColor(event.color);
      setVisibility(event.visibility);
      setProjectId(event.project_id);
      setRecurrence(event.recurrence_rule);
      setEnableMeeting(Boolean(event.meeting_id));
      setAttendeeIds((event.attendees || []).map((a) => a.user_id));
      setReminders((event.reminders || []).map((r) => r.minutes_before));
    } else {
      const zone = browserTimezone();
      const start = seedStart ? new Date(seedStart) : roundedNow();
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setTz(zone);
      setTitle('');
      setDescription('');
      setLocation('');
      setAllDay(Boolean(seedAllDay));
      setStartInput(utcISOToZonedInput(start.toISOString(), zone));
      setEndInput(utcISOToZonedInput(end.toISOString(), zone));
      setColor(EVENT_COLORS[0]);
      setVisibility('workspace');
      setProjectId(null);
      setRecurrence(null);
      setEnableMeeting(false);
      setAttendeeIds(currentUserId ? [currentUserId] : []);
      setReminders([10]);
    }
  }, [open, mode, event, seedStart, seedAllDay, currentUserId]);

  const toggleAttendee = (id: string) =>
    setAttendeeIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleReminder = (v: number) =>
    setReminders((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startInput || !endInput) return;
    let startISO = zonedInputToUtcISO(startInput, tz);
    let endISO = zonedInputToUtcISO(endInput, tz);
    if (new Date(endISO) <= new Date(startISO)) {
      // Auto-correct: end one hour after start.
      endISO = new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString();
    }
    if (allDay) {
      // Normalize all-day to date boundaries.
      startISO = `${startInput.slice(0, 10)}T00:00:00.000Z`;
      endISO = `${endInput.slice(0, 10)}T23:59:59.000Z`;
    }
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      start_at: startISO,
      end_at: endISO,
      all_day: allDay,
      timezone: tz,
      color,
      visibility,
      project_id: projectId,
      recurrence_rule: recurrence,
      enable_meeting: enableMeeting,
      attendeeIds,
      reminderMinutes: reminders,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    setDeleting(true);
    await onDelete(event);
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit acara' : 'Acara baru'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Perbarui detail acara dan undangan tim.' : 'Buat acara, undang tim, dan atur pengingat.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 pt-1">
          {/* Title + color */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="ev-title">Judul</Label>
              <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="cth. Sprint planning" required autoFocus />
            </div>
            <ColorPicker color={color} onChange={setColor} />
          </div>

          {/* All-day toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 rounded border-border accent-[var(--color-primary,#106CD8)]" />
            Sepanjang hari
          </label>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Mulai</Label>
              <Input id="ev-start" type={allDay ? 'date' : 'datetime-local'} value={allDay ? startInput.slice(0, 10) : startInput} onChange={(e) => setStartInput(allDay ? `${e.target.value}T00:00` : e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">Selesai</Label>
              <Input id="ev-end" type={allDay ? 'date' : 'datetime-local'} value={allDay ? endInput.slice(0, 10) : endInput} onChange={(e) => setEndInput(allDay ? `${e.target.value}T00:00` : e.target.value)} required />
            </div>
          </div>

          {/* Timezone */}
          <Field icon={Globe} label="Zona waktu">
            <select value={tz} onChange={(e) => setTz(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {TIMEZONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          {/* Recurrence */}
          <Field icon={Repeat} label="Pengulangan">
            <select value={recurrence ?? ''} onChange={(e) => setRecurrence(e.target.value || null)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {RECURRENCE_PRESETS.map((p) => <option key={p.label} value={p.rule ?? ''}>{p.label}</option>)}
            </select>
          </Field>

          {/* Location */}
          <Field icon={MapPin} label="Lokasi (opsional)">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="cth. Ruang rapat / tautan" />
          </Field>

          {/* Project */}
          {projects.length > 0 && (
            <Field icon={Palette} label="Proyek (opsional)">
              <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">— Tanpa proyek —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </Field>
          )}

          {/* Visibility */}
          <div className="flex gap-2">
            <VisibilityChip active={visibility === 'workspace'} onClick={() => setVisibility('workspace')} icon={Users} label="Tim" hint="Terlihat semua anggota" />
            <VisibilityChip active={visibility === 'private'} onClick={() => setVisibility('private')} icon={Lock} label="Pribadi" hint="Hanya Anda & tamu" />
          </div>

          {/* Native meeting */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Video className="h-4 w-4 text-primary" /> Tambahkan rapat RuangBaru
            </span>
            <input type="checkbox" checked={enableMeeting} onChange={(e) => setEnableMeeting(e.target.checked)} className="h-4 w-4 rounded border-border accent-[var(--color-primary,#106CD8)]" />
          </label>

          {/* Reminders */}
          <Field icon={Bell} label="Pengingat">
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_OPTIONS.map((r) => {
                const sel = reminders.includes(r.value);
                return (
                  <button type="button" key={r.value} onClick={() => toggleReminder(r.value)}
                    className={cn('rounded-full border px-2.5 py-1 text-xs font-medium transition-colors', sel ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent/50')}>
                    {r.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Attendees */}
          {members.length > 0 && (
            <Field icon={Users} label="Undang anggota">
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-border p-1.5">
                {members.filter((m) => m.profile).map((m) => {
                  const sel = attendeeIds.includes(m.user_id);
                  const self = m.user_id === currentUserId;
                  return (
                    <button type="button" key={m.user_id} disabled={self} onClick={() => toggleAttendee(m.user_id)}
                      className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors', sel ? 'bg-primary/10' : 'hover:bg-accent/50', self && 'opacity-60')}>
                      <Avatar className="h-6 w-6"><AvatarImage src={m.profile?.avatar_url || ''} /><AvatarFallback className="text-[9px]">{getInitials(m.profile?.full_name || m.profile?.email)}</AvatarFallback></Avatar>
                      <span className="flex-1 truncate text-xs font-medium text-foreground">{m.profile?.full_name || m.profile?.email}{self && ' (Anda)'}</span>
                      <span className={cn('flex h-4 w-4 items-center justify-center rounded border text-[9px]', sel ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}>{sel && '✓'}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Catatan</Label>
            <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Agenda, tautan, atau catatan…" className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {mode === 'edit' && onDelete && (
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0 text-rose-500 hover:bg-rose-500/10" onClick={handleDelete} disabled={deleting} aria-label="Hapus acara">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
            <Button type="submit" className="flex-1 gap-1.5" disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'edit' ? 'Simpan perubahan' : 'Buat acara'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</Label>
      {children}
    </div>
  );
}

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="h-10 w-10 rounded-lg border border-border" style={{ background: color }} aria-label="Pilih warna" />
      {open && (
        <div className="absolute right-0 z-50 mt-1 grid grid-cols-4 gap-1.5 rounded-xl border border-border bg-popover p-2 shadow-lg">
          {EVENT_COLORS.map((c) => (
            <button type="button" key={c} onClick={() => { onChange(c); setOpen(false); }} className={cn('h-6 w-6 rounded-full border-2', color === c ? 'border-foreground' : 'border-transparent')} style={{ background: c }} />
          ))}
        </div>
      )}
    </div>
  );
}

function VisibilityChip({ active, onClick, icon: Icon, label, hint }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; hint: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex flex-1 flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors', active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50')}>
      <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
    </button>
  );
}
