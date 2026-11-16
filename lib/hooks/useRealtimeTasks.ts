'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types';

// Same projection used by the tasks page's initial fetch — keeps the joined
// `assignee` / `project` fields on every task so cards render identically
// whether they came from the first load or from a realtime event.
const TASK_SELECT = '*, assignee:assignee_id(full_name, avatar_url), project:projects(name, color)';

/**
 * Keeps a Task[] state in sync with the `tasks` table for one workspace.
 *
 * INSERT/UPDATE: re-fetch the affected row with its joined relations, then
 * upsert by id (dedupes the optimistic create already done by the page).
 * DELETE: drop the row by id.
 *
 * Requires `tasks` in the `supabase_realtime` publication (migration 003).
 */
export function useRealtimeTasks(
  workspaceId: string | undefined,
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
) {
  useEffect(() => {
    if (!workspaceId) return;

    const supabase = createClient();
    // Defensive: during a build without env vars createClient() returns a mock.
    if (!supabase?.channel) return;

    const channel = supabase
      .channel(`workspace-tasks:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id;
            if (deletedId) setTasks((prev) => prev.filter((t) => t.id !== deletedId));
            return;
          }

          const row = payload.new as Task | undefined;
          if (!row?.id) return;

          const { data } = await supabase
            .from('tasks')
            .select(TASK_SELECT)
            .eq('id', row.id)
            .maybeSingle();

          // Fall back to the raw payload if the follow-up read is blocked by RLS
          // or races with a delete — the card still appears, just without joins.
          const full = (data as Task | null) ?? row;

          setTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === full.id);
            if (idx === -1) return [full, ...prev];
            const next = [...prev];
            next[idx] = full;
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, setTasks]);
}
