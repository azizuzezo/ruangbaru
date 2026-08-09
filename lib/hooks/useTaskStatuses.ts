'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TaskStatusDef } from '@/types';

/**
 * Fetches a workspace's Kanban columns (task_statuses), ordered by
 * position. Shared by KanbanBoard, the Tasks page, TaskDetailSheet,
 * Settings' column manager, and Dashboard's completion stats — all of
 * them need the same "what are this workspace's columns, and which one(s)
 * count as done" answer.
 */
export function useTaskStatuses(workspaceId: string | undefined) {
  const [statuses, setStatuses] = useState<TaskStatusDef[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const reload = useCallback(async () => {
    if (!workspaceId) { setStatuses([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('task_statuses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });
    setStatuses((data as TaskStatusDef[]) || []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { reload(); }, [reload]);

  const doneKeys = new Set(statuses.filter((s) => s.is_done).map((s) => s.key));
  const defaultKey = statuses[0]?.key ?? 'todo';

  return { statuses, loading, reload, doneKeys, defaultKey };
}
