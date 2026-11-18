'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n/useT';
import TasksPage from '../page';

/**
 * A task's own link: /<workspace-slug>/tasks/<task-number>.
 *
 * Renders the normal Tasks board and opens the task's detail sheet on top of
 * it. Emails and notifications point here, so the link has to work even when
 * the reader's last-used workspace is a different one: the workspace is taken
 * from the URL slug (the rest of the app reads it from the store), and the
 * store is switched to it first. Closing the sheet returns to the board.
 */
export default function TaskLinkPage() {
  const params = useParams<{ workspace: string; taskNumber: string }>();
  const slug = params.workspace;
  const taskNumber = Number(params.taskNumber);
  const router = useRouter();
  const t = useT('tasks');
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const { taskDetailOpen, setTaskDetailOpen } = useUIStore();
  const opened = useRef(false);

  const target = workspaces.find((w) => w.slug === slug);

  // 1. Make the linked workspace the active one (or bail if not a member).
  useEffect(() => {
    if (workspaces.length === 0) return; // app layout still loading
    if (!target) {
      toast.error(t('taskLinkNotFound'));
      router.replace(`/${currentWorkspace?.slug || slug}/tasks`);
      return;
    }
    if (currentWorkspace?.id !== target.id) setCurrentWorkspace(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, workspaces.length]);

  // 2. Resolve the number to a task and open it.
  useEffect(() => {
    if (!target || currentWorkspace?.id !== target.id) return;
    if (!Number.isInteger(taskNumber) || taskNumber < 1) {
      toast.error(t('taskLinkNotFound'));
      router.replace(`/${slug}/tasks`);
      return;
    }
    let cancelled = false;
    createClient()
      .from('tasks')
      .select('id')
      .eq('workspace_id', target.id)
      .eq('task_number', taskNumber)
      .maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => {
        if (cancelled) return;
        if (!data) {
          toast.error(t('taskLinkNotFound'));
          router.replace(`/${slug}/tasks`);
          return;
        }
        opened.current = true;
        setTaskDetailOpen(true, data.id);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, currentWorkspace?.id, taskNumber]);

  // 3. Closing the sheet goes back to the plain board URL.
  useEffect(() => {
    if (opened.current && !taskDetailOpen) {
      opened.current = false;
      router.replace(`/${slug}/tasks`);
    }
  }, [taskDetailOpen, router, slug]);

  return <TasksPage />;
}
