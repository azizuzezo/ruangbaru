'use client';

import { useUIStore } from '@/lib/stores/ui-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useEffect, useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { RichTextEditor, type RichTextValue } from '@/components/editor/RichTextEditor';
import { RichTextContent } from '@/components/editor/RichTextContent';
import { notifyCollaborationEmail } from '@/lib/client/notify-email';
import type { Task, Profile, TaskComment, TaskAttachment, TaskCollaborator } from '@/types';
import {
  Loader2, Calendar, CheckSquare, Layers, Trash2,
  User, MessageSquare, Send, Save, CheckCircle,
  Paperclip, Download, FileIcon, Plus, UserPlus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatRelativeTime, extractMentionIds, formatFileSize, getInitials } from '@/lib/utils';
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';
import { useCustomFields } from '@/lib/hooks/useCustomFields';
import type { TaskCustomFieldValue } from '@/types';
import { useT } from '@/lib/i18n/useT';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

export function TaskDetailSheet() {
  const { taskDetailOpen, taskDetailId, setTaskDetailOpen } = useUIStore();
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { statuses, doneKeys } = useTaskStatuses(currentWorkspace?.id);
  const { fields: customFields } = useCustomFields(currentWorkspace?.id);
  const t = useT('tasks');
  const tc = useT('common');

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

  // Members for assignee dropdown — doubles as the @mention candidate list.
  const [members, setMembers] = useState<Profile[]>([]);
  const mentionUsers = members.map((m) => ({ id: m.id, label: m.full_name || m.email }));
  // Tracks the description's mention ids as of last load/save, so saving
  // only notifies newly-added mentions rather than re-notifying every time.
  const prevDescriptionMentionIds = useRef<string[]>([]);

  // Attachments
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collaborators — additional people looped in beyond the single assignee.
  const [collaborators, setCollaborators] = useState<TaskCollaborator[]>([]);
  const [addCollabOpen, setAddCollabOpen] = useState(false);
  const [addingCollabId, setAddingCollabId] = useState<string | null>(null);
  const [removingCollabId, setRemovingCollabId] = useState<string | null>(null);

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
          .select('*, assignee:assignee_id(id, full_name, avatar_url), creator:created_by(id, full_name, avatar_url, email)')
          .eq('id', taskDetailId)
          .single();

        if (taskErr) throw taskErr;
        setTask(taskData as Task);
        setTitle(taskData.title);
        descriptionRef.current = {
          json: taskData.description ?? null,
          text: taskData.description_text || '',
        };
        prevDescriptionMentionIds.current = extractMentionIds(taskData.description ?? null);
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

        // 5. Load attachments
        const { data: attData } = await supabase
          .from('task_attachments')
          .select('*, uploader:uploaded_by(full_name, avatar_url)')
          .eq('task_id', taskDetailId)
          .order('created_at', { ascending: true });
        setAttachments((attData as TaskAttachment[]) || []);

        // 6. Load collaborators
        const { data: collabData } = await supabase
          .from('task_collaborators')
          .select('*, profile:user_id(full_name, avatar_url, email)')
          .eq('task_id', taskDetailId)
          .order('created_at', { ascending: true });
        setCollaborators((collabData as TaskCollaborator[]) || []);
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

      // Notify anyone newly @mentioned in the description since last save.
      const newMentionIds = extractMentionIds(descriptionRef.current.json);
      const addedMentionIds = newMentionIds.filter(
        (id) => !prevDescriptionMentionIds.current.includes(id) && id !== currentUser?.id
      );
      if (addedMentionIds.length && currentUser && currentWorkspace) {
        await supabase.from('notifications').insert(
          addedMentionIds.map((userId) => ({
            user_id: userId,
            type: 'mention',
            title: t('mentionNotificationTitle'),
            body: t('mentionNotificationBody')
              .replace('{name}', currentUser.full_name || currentUser.email)
              .replace('{title}', title),
            link: `/${currentWorkspace.slug}/tasks`,
            actor_id: currentUser.id,
            workspace_id: currentWorkspace.id,
          }))
        );
      }
      prevDescriptionMentionIds.current = newMentionIds;

      // Email the people who need to know: newly mentioned users, and the
      // task creator when the status changed. In-app notifications above
      // already handle the on-site bell.
      if (currentWorkspace) {
        if (addedMentionIds.length) {
          notifyCollaborationEmail({
            workspaceId: currentWorkspace.id,
            taskId: task.id,
            recipientIds: addedMentionIds,
            kind: 'mention',
            taskTitle: title,
            location: 'description',
          });
        }
        if (status !== task.status && task.creator && task.creator.id !== currentUser?.id) {
          notifyCollaborationEmail({
            workspaceId: currentWorkspace.id,
            taskId: task.id,
            recipientIds: [task.creator.id],
            kind: 'status',
            taskTitle: title,
            detail: statuses.find((s) => s.key === status)?.name || status,
          });
        }
      }

      toast.success(t('saveSuccessToast'));
      // Trigger a window event or update parent list indirectly
      window.dispatchEvent(new Event('task-updated'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
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

      // Notify anyone @mentioned in this comment.
      const commentMentionIds = extractMentionIds(json).filter((id) => id !== currentUser.id);
      if (commentMentionIds.length && currentWorkspace) {
        await supabase.from('notifications').insert(
          commentMentionIds.map((userId) => ({
            user_id: userId,
            type: 'mention',
            title: t('mentionCommentNotificationTitle'),
            body: t('mentionCommentNotificationBody')
              .replace('{name}', currentUser.full_name || currentUser.email)
              .replace('{title}', task.title),
            link: `/${currentWorkspace.slug}/tasks`,
            actor_id: currentUser.id,
            workspace_id: currentWorkspace.id,
          }))
        );
      }

      // Email the creator about the reply, plus anyone newly @mentioned.
      if (currentWorkspace) {
        const creatorId = task.creator?.id;
        if (creatorId && creatorId !== currentUser.id) {
          notifyCollaborationEmail({
            workspaceId: currentWorkspace.id,
            taskId: task.id,
            recipientIds: [creatorId],
            kind: 'comment',
            taskTitle: task.title,
            detail: text.slice(0, 300),
          });
        }
        if (commentMentionIds.length) {
          notifyCollaborationEmail({
            workspaceId: currentWorkspace.id,
            taskId: task.id,
            recipientIds: commentMentionIds,
            kind: 'mention',
            taskTitle: task.title,
            location: 'comment',
          });
        }
      }

      commentRef.current = { json: null, text: '' };
      setCommentEmpty(true);
      setCommentKey((k) => k + 1); // reset composer
      toast.success(t('commentSuccessToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setPostingComment(false);
    }
  };

  // Upload attachment
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !task || !currentUser) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(t('attachmentTooLargeToast'));
      return;
    }

    setUploading(true);
    try {
      const path = `${task.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('attachments').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: task.id,
          uploaded_by: currentUser.id,
          storage_path: path,
          name: file.name,
          size_bytes: file.size,
          mime_type: file.type || null,
        })
        .select('*, uploader:uploaded_by(full_name, avatar_url)')
        .single();
      if (error) throw error;

      setAttachments((prev) => [...prev, data as TaskAttachment]);
      toast.success(t('attachmentUploadSuccessToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setUploading(false);
    }
  };

  // Download attachment — bucket is private, so a signed URL is required.
  const handleDownloadAttachment = async (attachment: TaskAttachment) => {
    setDownloadingAttachmentId(attachment.id);
    try {
      const { data, error } = await supabase.storage.from('attachments').createSignedUrl(attachment.storage_path, 60);
      if (error || !data?.signedUrl) {
        toast.error(t('attachmentDownloadErrorToast'));
        return;
      }
      window.open(data.signedUrl, '_blank');
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachment: TaskAttachment) => {
    setDeletingAttachmentId(attachment.id);
    try {
      const { error: storageErr } = await supabase.storage.from('attachments').remove([attachment.storage_path]);
      if (storageErr) throw storageErr;
      const { error } = await supabase.from('task_attachments').delete().eq('id', attachment.id);
      if (error) throw error;
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast.success(t('attachmentDeleteSuccessToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  // Add a collaborator to this task + notify them.
  const handleAddCollaborator = async (userId: string) => {
    if (!task || !currentWorkspace || !currentUser) return;
    setAddingCollabId(userId);
    try {
      const { data, error } = await supabase
        .from('task_collaborators')
        .insert({ task_id: task.id, user_id: userId, added_by: currentUser.id })
        .select('*, profile:user_id(full_name, avatar_url, email)')
        .single();
      if (error) throw error;

      setCollaborators((prev) => [...prev, data as TaskCollaborator]);

      if (userId !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'task_collaborator',
          title: t('collaboratorNotificationTitle'),
          body: t('collaboratorNotificationBody')
            .replace('{name}', currentUser.full_name || currentUser.email)
            .replace('{title}', task.title),
          link: `/${currentWorkspace.slug}/tasks`,
          actor_id: currentUser.id,
          workspace_id: currentWorkspace.id,
        });
      }

      toast.success(t('collaboratorAddedToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setAddingCollabId(null);
    }
  };

  // Remove a collaborator from this task.
  const handleRemoveCollaborator = async (collab: TaskCollaborator) => {
    setRemovingCollabId(collab.id);
    try {
      const { error } = await supabase.from('task_collaborators').delete().eq('id', collab.id);
      if (error) throw error;
      setCollaborators((prev) => prev.filter((c) => c.id !== collab.id));
      toast.success(t('collaboratorRemovedToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setRemovingCollabId(null);
    }
  };

  const addableCollabMembers = members.filter((m) => !collaborators.some((c) => c.user_id === m.id));

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
              <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={task.creator?.avatar_url || ''} />
                    <AvatarFallback className="text-[7px]">{getInitials(task.creator?.full_name || task.creator?.email)}</AvatarFallback>
                  </Avatar>
                  {t('createdByPrefix')} {task.creator?.full_name || task.creator?.email || t('someoneFallback')}
                </span>
                <span className="text-muted-foreground">· {t('detailUpdatedAtPrefix')} {formatRelativeTime(task.updated_at)}</span>
              </SheetDescription>
            </SheetHeader>

            {/* Collaborators — sits at the top of the task, above everything
                else, since looping someone in is meant to be a one-click
                action rather than buried under other fields. */}
            <div className="flex items-center gap-2 pt-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{t('collaboratorsLabel')}</span>
              <div className="flex items-center -space-x-2">
                {collaborators.map((c) => (
                  <div key={c.id} className="group relative">
                    {removingCollabId === c.id ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted">
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={c.profile?.avatar_url || ''} />
                        <AvatarFallback className="text-[8px]">{getInitials(c.profile?.full_name)}</AvatarFallback>
                      </Avatar>
                    )}
                    {removingCollabId !== c.id && (
                      <button
                        onClick={() => handleRemoveCollaborator(c)}
                        title={t('collaboratorRemoveTooltip')}
                        className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setAddCollabOpen(true)}
                title={t('collaboratorAddButton')}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <UserPlus className="h-3 w-3" />
              </button>
            </div>

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
                  mentionUsers={mentionUsers}
                />
              </div>

              {/* Attachments */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" /> {t('attachmentsHeader')} ({attachments.length})
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[10px]"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    {t('attachmentAddButton')}
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadAttachment} />
                </div>

                {attachments.length === 0 ? (
                  <p className="py-1.5 text-[11px] text-muted-foreground/70">{t('attachmentsEmptyState')}</p>
                ) : (
                  <div className="space-y-1.5">
                    {attachments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-2.5 py-2">
                        <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(a.size_bytes)} · {a.uploader?.full_name || t('commentAuthorFallback')} · {formatRelativeTime(a.created_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(a)}
                          disabled={downloadingAttachmentId === a.id}
                          title={t('attachmentDownloadTooltip')}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                          {downloadingAttachmentId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        </button>
                        {a.uploaded_by === currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(a)}
                            disabled={deletingAttachmentId === a.id}
                            title={t('attachmentDeleteTooltip')}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            {deletingAttachmentId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                      <RichTextContent
                        content={c.body}
                        mentionUsers={mentionUsers}
                        hrefForMention={() => `/${currentWorkspace?.slug || 'dashboard'}/team`}
                        className="mt-0.5 text-[11px] text-muted-foreground [&_p]:my-0"
                      />
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
                  mentionUsers={mentionUsers}
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

      <Dialog open={addCollabOpen} onOpenChange={setAddCollabOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> {t('collaboratorDialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('collaboratorDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {addableCollabMembers.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t('collaboratorNoneToAdd')}</p>
            ) : (
              addableCollabMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.avatar_url || ''} />
                      <AvatarFallback className="text-[9px]">{getInitials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{m.full_name || m.email}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 gap-1 text-[11px]"
                    disabled={addingCollabId === m.id}
                    onClick={() => handleAddCollaborator(m.id)}
                  >
                    {addingCollabId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    {t('collaboratorAddButton')}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
