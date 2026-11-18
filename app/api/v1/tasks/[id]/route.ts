import { createAdminClient } from '@/lib/supabase/admin';
import { resolveApiKey, corsJson, corsOptionsResponse, unauthorized } from '@/lib/api/auth';
import { API_TASK_SELECT, presentTask, taskIdFilter, type Row } from '@/lib/api/tasks';

export async function OPTIONS() {
  return corsOptionsResponse();
}

// `:id` is the task's UUID or its number (/tasks/42 for task #42).

// GET /api/v1/tasks/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();
  const { column, value } = taskIdFilter((await params).id);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tasks')
    .select(API_TASK_SELECT)
    .eq(column, value)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();
  if (error) {
    console.error('[GET /api/v1/tasks/:id]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  if (!data) return corsJson({ error: 'Task not found' }, { status: 404 });
  return corsJson({ data: presentTask(data as Row, request, ctx.workspaceSlug) });
}

// PATCH /api/v1/tasks/:id — update any subset of
// { title, status, priority, due_date, assignee_id, description }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();
  const { column, value } = taskIdFilter((await params).id);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return corsJson({ error: 'Invalid JSON body' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.status === 'string') patch.status = body.status;
  if (typeof body.priority === 'string') patch.priority = body.priority;
  if (typeof body.due_date === 'string' || body.due_date === null) patch.due_date = body.due_date;
  if (typeof body.assignee_id === 'string' || body.assignee_id === null) patch.assignee_id = body.assignee_id;
  if (typeof body.description === 'string') patch.description_text = body.description;

  if (Object.keys(patch).length === 0) {
    return corsJson({ error: 'No recognized fields to update' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Moving into (or out of) a column marked "done" stamps completed_at, the
  // same as moving the card in the app.
  if (typeof patch.status === 'string') {
    const { data: col } = await admin
      .from('task_statuses')
      .select('is_done')
      .eq('workspace_id', ctx.workspaceId)
      .eq('key', patch.status)
      .maybeSingle();
    patch.completed_at = col?.is_done ? new Date().toISOString() : null;
  }

  const { data, error } = await admin
    .from('tasks')
    .update(patch)
    .eq(column, value)
    .eq('workspace_id', ctx.workspaceId)
    .select(API_TASK_SELECT)
    .maybeSingle();

  if (error) {
    console.error('[PATCH /api/v1/tasks/:id]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  if (!data) return corsJson({ error: 'Task not found' }, { status: 404 });
  return corsJson({ data: presentTask(data as Row, request, ctx.workspaceSlug) });
}

// DELETE /api/v1/tasks/:id
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();
  const { column, value } = taskIdFilter((await params).id);

  const admin = createAdminClient();
  const { error, count } = await admin
    .from('tasks')
    .delete({ count: 'exact' })
    .eq(column, value)
    .eq('workspace_id', ctx.workspaceId);

  if (error) {
    console.error('[DELETE /api/v1/tasks/:id]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  if (!count) return corsJson({ error: 'Task not found' }, { status: 404 });
  return corsJson({ data: { deleted: true } });
}
