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
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';
import { useCustomFields } from '@/lib/hooks/useCustomFields';
import type { TaskCustomFieldValue } from '@/types';
import { useT } from '@/lib/i18n/useT';

export function TaskDetailSheet() {
  const { taskDetailOpen, taskDetailId, setTaskDetailOpen } = useUIStore();
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { statuses, doneKeys } = useTaskStatuses(currentWorkspace?.id);
  const { fields: customFields } = useCustomFields(currentWorkspace?.id);
  const t = useT('tasks');

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
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

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

        // 4. Load this task's custom field values, if any workspace has any defined.
        const { data: fvData } = await supabase
          .from('task_custom_field_values')
          .select('field_id, value')
          .eq('task_id', taskDetailId);
        const fv: Record<string, string> = {};
        ((fvData as Pick<TaskCustomFieldValue, 'field_id' | 'value'>[]) || []).forEach((row) => {
          fv[row.field_id] = row.value == null ? '' : String(row.value);
        });
        setFieldValues(fv);
      } catch (err: any) {
        console.error('Error loading task details:', err);
        toast.error(t('loadErrorToast'));
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
          completed_at: doneKeys.has(status) ? (task.completed_at || new Date().toISOString()) : null,
        })
        .eq('id', task.id)
        .select()
        .single();

      if (error) throw error;

      // Save custom field values (one upsert per field that has a value).
      const rows = customFields
        .filter((f) => (fieldValues[f.id] ?? '').trim() !== '')
        .map((f) => ({ task_id: task.id, field_id: f.id, value: fieldValues[f.id] }));
      if (rows.length) {
        await supabase.from('task_custom_field_values').upsert(rows, { onConflict: 'task_id,field_id' });
      }

      toast.success(t('saveSuccessToast'));
      // Trigger a window event or update parent list indirectly
      window.dispatchEvent(new Event('task-updated'));
    } catch (err: any) {
      toast.error(err.message || t('saveErrorToast'));
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
      toast.success(t('commentSuccessToast'));
    } catch (err: any) {
      toast.error(err.message || t('commentErrorToast'));
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
                <CheckSquare className="h-4 w-4 text-primary" /> {t('sheetTitle')}
              </SheetTitle>
              <SheetDescription className="text-[10px]">
                {t('detailUpdatedAtPrefix')} {formatRelativeTime(task.updated_at)}
              </SheetDescription>
            </SheetHeader>

            {/* Form editors */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('detailTitleLabel')}</label>
                <Input
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="font-bold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('statusLabel')}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {statuses.map((s) => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('priorityLabel')}</label>
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
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('dueDateLabel')}</label>
                  <Input
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                    className="h-8 text-xs" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('assigneeLabel')}</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">{t('unassignedOption')}</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">{t('workDescriptionLabel')}</label>
                <RichTextEditor
                  key={`desc-${task.id}`}
                  content={task.description ?? null}
                  placeholder={t('workDescriptionPlaceholder')}
                  onChange={(value) => { descriptionRef.current = value; }}
                />
              </div>

              {/* Custom fields — admin-defined per workspace, Pengaturan > Field Kustom */}
              {customFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                  {customFields.map((f) => (
                    <div key={f.id} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">{f.name}</label>
                      {f.field_type === 'select' ? (
                        <select
                          value={fieldValues[f.id] || ''}
                          onChange={(e) => setFieldValues((v) => ({ ...v, [f.id]: e.target.value }))}
                          className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">{t('selectPlaceholder')}</option>
                          {f.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                          value={fieldValues[f.id] || ''}
                          onChange={(e) => setFieldValues((v) => ({ ...v, [f.id]: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-full h-9 text-xs">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {t('saveButton')}
              </Button>
            </div>

            {/* Comments log */}
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" /> {t('commentsHeader')} ({comments.length})
              </h4>
              
              <div className="space-y-3 max-h-48 overflow-y-auto divide-y divide-border/40 pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="pt-2 text-xs flex gap-2.5 items-start">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                      {c.user?.full_name ? c.user.full_name[0].toUpperCase() : '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span>{c.user?.full_name || t('commentAuthorFallback')}</span>
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
                  placeholder={t('commentPlaceholder')}
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
                    {t('sendButton')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {t('taskNotFound')}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
