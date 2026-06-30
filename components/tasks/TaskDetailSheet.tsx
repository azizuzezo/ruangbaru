'use client';

import { useUIStore } from '@/lib/stores/ui-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useEffect, useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { RichTextEditor, type RichTextValue } from '@/components/editor/RichTextEditor';
import type { Task, Profile, TaskComment } from '@/types';
import { 
  Loader2, Calendar, CheckSquare, Layers, Trash2, 
  User, MessageSquare, Send, Save, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';

export function TaskDetailSheet() {
  const { taskDetailOpen, taskDetailId, setTaskDetailOpen } = useUIStore();
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Edit states
  const [title, setTitle] = useState('');
  const descriptionRef = useRef<RichTextValue>({ json: null, text: '' });
  const [status, setStatus] = useState<any>('todo');
  const [priority, setPriority] = useState<any>('no_priority');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [saving, setSaving] = useState(false);

  // Comments states
  const [comments, setComments] = useState<TaskComment[]>([]);
  const commentRef = useRef<RichTextValue>({ json: null, text: '' });
  const [commentKey, setCommentKey] = useState(0); // bump to reset composer
  const [commentEmpty, setCommentEmpty] = useState(true);
  const [postingComment, setPostingComment] = useState(false);

  // Members for assignee dropdown
  const [members, setMembers] = useState<Profile[]>([]);

  const supabase = createClient();

  // Load task detail
  useEffect(() => {
    if (!taskDetailId || !taskDetailOpen) return;

    async function loadTaskAndMembers() {
      try {
        setLoading(true);

        // 1. Load task data
        const { data: taskData, error: taskErr } = await supabase
          .from('tasks')
          .select('*, assignee:assignee_id(id, full_name, avatar_url)')
          .eq('id', taskDetailId)
          .single();

        if (taskErr) throw taskErr;
        setTask(taskData as Task);
        setTitle(taskData.title);
        descriptionRef.current = {
          json: taskData.description ?? null,
          text: taskData.description_text || '',
        };
        setStatus(taskData.status);
        setPriority(taskData.priority);
        setDueDate(taskData.due_date || '');
        setAssigneeId(taskData.assignee_id || '');

        // 2. Load comments
        const { data: commentsData } = await supabase
          .from('task_comments')
          .select('*, user:profiles(full_name, avatar_url)')
          .eq('task_id', taskDetailId)
          .order('created_at', { ascending: true });

        setComments((commentsData as any[]) || []);

        // 3. Load workspace members for assignments
        const { data: wsMembers } = await supabase
          .from('workspace_members')
          .select('profiles(*)')
          .eq('workspace_id', currentWorkspace?.id);

        const profileData = wsMembers?.map((m: any) => m.profiles).filter(Boolean) as Profile[];
        setMembers(profileData || []);
      } catch (err: any) {
        console.error('Error loading task details:', err);
        toast.error('Gagal memuat detail tugas');
      } finally {
        setLoading(false);
      }
    }

    loadTaskAndMembers();
  }, [taskDetailId, taskDetailOpen, currentWorkspace]);

  // Save changes handler
  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title,
          description: descriptionRef.current.json,
          description_text: descriptionRef.current.text,
          status,
          priority,
          due_date: dueDate || null,
          assignee_id: assigneeId || null,
        })
        .eq('id', task.id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Tugas diperbarui');
      // Trigger a window event or update parent list indirectly
      window.dispatchEvent(new Event('task-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pembaruan');
    } finally {
      setSaving(false);
    }
  };

  // Post comment
  const handlePostComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const { json, text } = commentRef.current;
    if (!text.trim() || !task || !currentUser) return;
    setPostingComment(true);

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: currentUser.id,
          body: json ?? { type: 'doc', content: [] },
          body_text: text,
        })
        .select('*, user:profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, data as TaskComment]);
      commentRef.current = { json: null, text: '' };
      setCommentEmpty(true);
      setCommentKey((k) => k + 1); // reset composer
      toast.success('Komentar ditambahkan');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambahkan komentar');
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <Sheet open={taskDetailOpen} onOpenChange={(open) => setTaskDetailOpen(open, null)}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto flex flex-col justify-between">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : task ? (
          <div className="space-y-6">
            <SheetHeader className="text-left border-b border-border pb-4">
              <SheetTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <CheckSquare className="h-4 w-4 text-primary" /> Detail Tugas
              </SheetTitle>
              <SheetDescription className="text-[10px]">
                Diperbarui {formatRelativeTime(task.updated_at)}
              </SheetDescription>
            </SheetHeader>

            {/* Form editors */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Judul Tugas</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="font-bold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="no_priority">No Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Tenggat Waktu</label>
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                    className="h-8 text-xs" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Penerima Tugas</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Belum Ditugaskan</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi Pekerjaan</label>
                <RichTextEditor
                  key={`desc-${task.id}`}
                  content={task.description ?? null}
                  placeholder="Beri detail langkah pekerjaan tugas ini..."
                  onChange={(value) => { descriptionRef.current = value; }}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full h-9 text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Simpan Perubahan
              </Button>
            </div>

            {/* Comments log */}
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> Kolaborasi & Komentar ({comments.length})
              </h4>
              
              <div className="space-y-3 max-h-48 overflow-y-auto divide-y divide-border/40 pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="pt-2 text-xs flex gap-2.5 items-start">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                      {c.user?.full_name ? c.user.full_name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span>{c.user?.full_name || 'Rekan'}</span>
                        <span className="text-[8px] text-muted-foreground font-normal">{formatRelativeTime(c.created_at)}</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mt-0.5 text-[11px]">{c.body_text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add comment form */}
              <div className="flex flex-col gap-2">
                <RichTextEditor
                  key={`comment-${commentKey}`}
                  content={null}
                  placeholder="Tulis balasan komentar… (Ctrl+Enter untuk kirim)"
                  showToolbar={false}
                  onChange={(value) => {
                    commentRef.current = value;
                    const empty = !value.text.trim();
                    if (empty !== commentEmpty) setCommentEmpty(empty);
                  }}
                  onSubmit={() => handlePostComment()}
                  className="border border-input"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handlePostComment()}
                    disabled={postingComment || commentEmpty}
                    className="h-8 text-xs gap-1.5"
                  >
                    {postingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Kirim
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Tugas tidak tersedia
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
