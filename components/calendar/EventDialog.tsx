'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Loader2, Trash2, Video, MapPin, Bell, Repeat,
  Users as UsersIcon, Calendar, CheckSquare, ChevronRight,
  Folder, AlertCircle, Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalendarEvent, EventRecurrence, Workspace, Profile, Task, Project, TaskStatus, TaskPriority } from '@/types';

export type DialogMember = {
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
};

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

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];
const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";

const toInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

export function EventDialog({
  open, onOpenChange, workspace, currentUser, members, event, initialDate, onSaved, onDeleted, onTaskSaved,
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
  onTaskSaved?: (t: Task) => void;
}) {
  const supabase = createClient();
  const isEdit = !!event;

  // Tabs: 'event' | 'task'
  const [activeTab, setActiveTab] = useState<'event' | 'task'>('event');

  // --- Event form states ---
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

  // --- Task form states ---
  const [taskTitle, setTaskTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('backlog');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('no_priority');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  // --- Global states ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch projects when workspace changes or modal opens
  useEffect(() => {
    if (!open || !workspace) return;
    supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('status', 'active')
      .then((res: any) => {
        const projData = (res.data as Project[]) || [];
        setProjects(projData);
        if (projData.length > 0) {
          setProjectId(projData[0].id);
        }
      });
  }, [open, workspace]);

  // Hydrate from the event being edited, or sensible defaults for a new one.
  useEffect(() => {
    if (!open) return;
    if (event) {
      setActiveTab('event');
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
      setActiveTab('event');
      const startD = initialDate ? new Date(new Date(initialDate).setHours(9, 0, 0, 0)) : new Date(Math.ceil(Date.now() / 36e5) * 36e5);
      const endD = new Date(startD.getTime() + 36e5);
      setTitle('');
      setStart(toInput(startD.toISOString()));
      setEnd(toInput(endD.toISOString()));
      setAllDay(false);
      setLocation('');
      setDescription('');
      setColor(COLORS[0]);
      setRecurrence('none');
      setUntil('');
      setReminder('');
      setEnableMeeting(false);
      setInvitees([]);

      // Task defaults
      setTaskTitle('');
      setTaskStatus('todo');
      setTaskPriority('no_priority');
      setTaskDueDate(initialDate ? format(new Date(initialDate), 'yyyy-MM-dd') : '');
      setTaskDescription('');
      setTaskAssigneeId('');
    }
  }, [open, event, initialDate]);

  const toggleInvite = (id: string) => setInvitees((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !start || !end) return;
    setSaving(true);
    try {
      const startIso = new Date(start).toISOString();
      const endIso = new Date(end).toISOString();

      let meetingId = event?.meeting_id || null;
      if (enableMeeting && !meetingId) {
        const { data: m } = await supabase.from('meetings').insert({
          workspace_id: workspace.id,
          title: title.trim(),
          room_name: `rb-${crypto.randomUUID()}`,
          created_by: currentUser.id,
          status: 'scheduled',
          scheduled_at: startIso,
        }).select('id').single();
        meetingId = m?.id || null;
        if (meetingId) {
          await supabase.from('meeting_participants').insert({
            meeting_id: meetingId,
            user_id: currentUser.id,
            role: 'host',
            invited: false
          });
        }
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

      if (saved && invitees.length) {
        await supabase.from('event_attendees').insert(invitees.map((u) => ({ event_id: saved!.id, user_id: u, status: 'invited' as const })));
        const others = invitees.filter((u) => u !== currentUser.id);
        if (others.length) {
          await supabase.from('notifications').insert(others.map((u) => ({
            user_id: u,
            type: 'mention',
            title: `Undangan acara: ${saved!.title}`,
            body: format(new Date(startIso), 'd MMM yyyy, HH:mm'),
            link: `/${workspace.slug}/calendar`,
            actor_id: currentUser.id,
            workspace_id: workspace.id,
          }))).then(() => {}, () => {});
        }
      }

      saved!.attendees = invitees.map((u) => ({ id: '', event_id: saved!.id, user_id: u, status: 'invited' as const }));
      onSaved(saved!);
      onOpenChange(false);
      toast.success(isEdit ? 'Acara diperbarui' : 'Acara dibuat');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan acara.');
    } finally {
      setSaving(false);
    }
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !projectId) {
      toast.error('Judul tugas dan Proyek wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspace.id,
          project_id: projectId,
          title: taskTitle.trim(),
          status: taskStatus,
          priority: taskPriority,
          due_date: taskDueDate || null,
          assignee_id: taskAssigneeId || null,
          created_by: currentUser.id,
          description: taskDescription.trim() || null,
        })
        .select('*, assignee:assignee_id(full_name, avatar_url), project:projects(name, icon)')
        .single();

      if (error) throw error;

      // Send notification to assignee if assigned to someone else
      if (taskAssigneeId && taskAssigneeId !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: taskAssigneeId,
          type: 'task_assigned',
          title: 'Tugas Baru Ditugaskan',
          body: `"${taskTitle}" telah ditugaskan kepada Anda oleh ${currentUser.full_name || currentUser.email}`,
          link: `/${workspace.slug}/tasks`,
          actor_id: currentUser.id,
          workspace_id: workspace.id,
        });
      }

      toast.success(`Tugas "${taskTitle}" berhasil dibuat!`);
      if (onTaskSaved) {
        onTaskSaved(data as unknown as Task);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal membuat tugas');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    setDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', event.id);
    setDeleting(false);
    if (error) {
      toast.error('Gagal menghapus acara');
      return;
    }
    onDeleted(event.id);
    onOpenChange(false);
    toast.success('Acara dihapus');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="relative max-h-[85vh] overflow-hidden p-0 sm:max-w-lg" style={{ fontFamily: FONT }}>
        {/* Glassmorphic Loading Overlay */}
        <AnimatePresence>
          {(saving || deleting) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2.5 text-xs font-semibold text-neutral-600">
                {deleting ? 'Menghapus acara...' : 'Menyimpan perubahan...'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="border-b border-neutral-100 p-4 pb-3">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-neutral-900 leading-none">
                {isEdit ? 'Edit Acara' : activeTab === 'event' ? 'Buat Acara Baru' : 'Buat Tugas Baru'}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-neutral-500">
                {activeTab === 'event'
                  ? 'Jadwalkan rapat atau agenda kolaborasi dengan tim.'
                  : 'Buat tugas kerja baru dan tentukan penanggung jawab.'}
              </DialogDescription>
            </DialogHeader>

            {/* Segmented Tab Switcher (only when creating new) */}
            {!isEdit && (
              <div className="mt-3 flex rounded-lg bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('event')}
                  className={cn(
                    'relative flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5',
                    activeTab === 'event' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Acara Kalender
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('task')}
                  className={cn(
                    'relative flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5',
                    activeTab === 'task' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  )}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  Tugas Baru
                </button>
              </div>
            )}
          </div>

          {/* Form container */}
          <div className="flex-1 overflow-y-auto p-4.5 space-y-3.5">
            {activeTab === 'event' ? (
              /* ==========================================
                 EVENT FORM
                 ========================================== */
              <form id="event-form" onSubmit={submitEvent} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ev-title" className="text-xs font-semibold text-neutral-700">Judul Acara</Label>
                  <Input
                    id="ev-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="cth. Rapat mingguan tim"
                    required
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-start" className="text-xs font-semibold text-neutral-700">Mulai</Label>
                    <Input
                      id="ev-start"
                      type="datetime-local"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-end" className="text-xs font-semibold text-neutral-700">Selesai</Label>
                    <Input
                      id="ev-end"
                      type="datetime-local"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Toggle active={allDay} onClick={() => setAllDay((v) => !v)}>Sepanjang hari</Toggle>
                  <Toggle active={enableMeeting} onClick={() => setEnableMeeting((v) => !v)}>
                    <Video className="h-3.5 w-3.5" /> Aktifkan rapat video
                  </Toggle>
                </div>

                {/* Color */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-neutral-700">Pilih Warna</Label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          'h-7 w-7 rounded-full border border-background transition-transform',
                          color === c ? 'scale-115 ring-2 ring-offset-2 ring-neutral-400' : 'hover:scale-105'
                        )}
                        style={{ background: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <Repeat className="h-3.5 w-3.5 text-neutral-400" /> Pengulangan
                    </Label>
                    <select
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-400"
                    >
                      {RECURRENCE.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <Bell className="h-3.5 w-3.5 text-neutral-400" /> Pengingat
                    </Label>
                    <select
                      value={reminder}
                      onChange={(e) => setReminder(e.target.value)}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-400"
                    >
                      {REMINDERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                {recurrence !== 'none' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ev-until" className="text-xs font-semibold text-neutral-700">Berulang hingga (opsional)</Label>
                    <Input
                      id="ev-until"
                      type="date"
                      value={until}
                      onChange={(e) => setUntil(e.target.value)}
                      className="h-10"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="ev-loc" className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                    <MapPin className="h-3.5 w-3.5 text-neutral-400" /> Lokasi (opsional)
                  </Label>
                  <Input
                    id="ev-loc"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="cth. Ruang rapat / online"
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ev-desc" className="text-xs font-semibold text-neutral-700">Catatan (opsional)</Label>
                  <textarea
                    id="ev-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-400"
                    placeholder="Agenda, tautan, atau detail lain"
                  />
                </div>

                {/* Invitees */}
                {members.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <UsersIcon className="h-3.5 w-3.5 text-neutral-400" /> Undang Anggota
                    </Label>
                    <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-neutral-200 p-1.5 bg-neutral-50/50">
                      {members.filter((m) => m.profile && m.user_id !== currentUser.id).map((m) => {
                        const sel = invitees.includes(m.user_id);
                        return (
                          <button
                            type="button"
                            key={m.user_id}
                            onClick={() => toggleInvite(m.user_id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                              sel ? 'bg-primary/10 text-primary' : 'hover:bg-neutral-100 text-neutral-700'
                            )}
                          >
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={m.profile?.avatar_url || ''} />
                              <AvatarFallback className="text-[9px] font-bold">
                                {getInitials(m.profile?.full_name || m.profile?.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 truncate text-xs font-medium">
                              {m.profile?.full_name || m.profile?.email}
                            </span>
                            <span
                              className={cn(
                                'flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold shrink-0',
                                sel ? 'border-primary bg-primary text-primary-foreground' : 'border-neutral-300 bg-white'
                              )}
                            >
                              {sel && '✓'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            ) : (
              /* ==========================================
                 TASK FORM
                 ========================================== */
              <form id="task-form" onSubmit={submitTask} className="space-y-4">
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-center">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <p className="mt-2 text-xs font-bold text-amber-800">Belum ada Proyek Aktif</p>
                    <p className="mt-1 text-[11px] text-amber-600">
                      Anda harus membuat Proyek terlebih dahulu sebelum bisa menambahkan Tugas.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="task-title" className="text-xs font-semibold text-neutral-700">Judul Tugas</Label>
                      <Input
                        id="task-title"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="cth. Buat desain konsep baru"
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                          <Folder className="h-3.5 w-3.5 text-neutral-400" /> Pilih Proyek
                        </Label>
                        <select
                          value={projectId}
                          onChange={(e) => setProjectId(e.target.value)}
                          className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-400"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.icon} {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="task-due" className="text-xs font-semibold text-neutral-700">Tenggat Waktu</Label>
                        <Input
                          id="task-due"
                          type="date"
                          value={taskDueDate}
                          onChange={(e) => setTaskDueDate(e.target.value)}
                          className="h-10 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700">Status</Label>
                        <select
                          value={taskStatus}
                          onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                          className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-400"
                        >
                          <option value="backlog">Backlog</option>
                          <option value="todo">Belum Dikerjakan</option>
                          <option value="in_progress">Sedang Dikerjakan</option>
                          <option value="in_review">Menunggu Review</option>
                          <option value="done">Selesai</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-neutral-700">Prioritas</Label>
                        <select
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                          className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-400"
                        >
                          <option value="no_priority">Tanpa Prioritas</option>
                          <option value="low">Rendah</option>
                          <option value="medium">Sedang</option>
                          <option value="high">Tinggi</option>
                          <option value="urgent">Genting</option>
                        </select>
                      </div>
                    </div>

                    {/* Assignee */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                        <UsersIcon className="h-3.5 w-3.5 text-neutral-400" /> Penerima Tugas
                      </Label>
                      <select
                        value={taskAssigneeId}
                        onChange={(e) => setTaskAssigneeId(e.target.value)}
                        className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-800 outline-none focus:border-neutral-400"
                      >
                        <option value="">Pilih Anggota Tim (opsional)</option>
                        {members
                          .filter((m) => m.profile)
                          .map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.profile?.full_name || m.profile?.email}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="task-desc" className="text-xs font-semibold text-neutral-700">Deskripsi Tugas (opsional)</Label>
                      <textarea
                        id="task-desc"
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 outline-none focus:border-neutral-400"
                        placeholder="Tambahkan detail tugas..."
                      />
                    </div>
                  </>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-100 p-4 flex items-center justify-between bg-neutral-50/50">
            {isEdit && activeTab === 'event' ? (
              <Button
                type="button"
                variant="ghost"
                onClick={remove}
                disabled={deleting}
                className="gap-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive h-9"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Hapus
              </Button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs font-semibold"
              >
                Batal
              </Button>
              {activeTab === 'event' ? (
                <Button
                  type="submit"
                  form="event-form"
                  disabled={saving || !title.trim() || !start || !end}
                  className="gap-1.5 h-9 text-xs font-semibold"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? 'Simpan' : 'Buat Acara'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="task-form"
                  disabled={saving || !taskTitle.trim() || projects.length === 0}
                  className="gap-1.5 h-9 text-xs font-semibold"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Buat Tugas
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
      )}
    >
      {children}
    </button>
  );
}
