import { taskPath } from '@/lib/tasks/meta';

/**
 * Shape every /api/v1 task response shares. `creator` is the person who
 * created the task (for tasks created through the API, the admin who owns the
 * API key that made the call).
 */
export const API_TASK_SELECT =
  'id, task_number, project_id, title, description_text, status, priority, assignee_id, due_date, completed_at, created_by, created_at, updated_at, creator:created_by(id, full_name, email)';

export type Row = { task_number: number; creator?: unknown } & Record<string, unknown>;

/** Adds the task's own web link and flattens the creator join. */
export function presentTask(row: Row, request: Request, workspaceSlug: string) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const creator = Array.isArray(row.creator) ? row.creator[0] ?? null : row.creator ?? null;
  return { ...row, creator, url: `${origin}${taskPath(workspaceSlug, row.task_number)}` };
}

/**
 * `:id` in /tasks/:id accepts either the task's UUID or its number
 * (e.g. /tasks/42 for task #42).
 */
export function taskIdFilter(id: string): { column: 'id' | 'task_number'; value: string | number } {
  return /^\d+$/.test(id) ? { column: 'task_number', value: Number(id) } : { column: 'id', value: id };
}
