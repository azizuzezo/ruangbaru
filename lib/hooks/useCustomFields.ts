'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TaskCustomFieldDef } from '@/types';

/** Fetches a workspace's admin-defined custom task fields, ordered by position. */
export function useCustomFields(workspaceId: string | undefined) {
  const [fields, setFields] = useState<TaskCustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const reload = useCallback(async () => {
    if (!workspaceId) { setFields([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('task_custom_fields')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true });
    setFields((data as TaskCustomFieldDef[]) || []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => { reload(); }, [reload]);

  return { fields, loading, reload };
}
