import { createAdminClient } from '@/lib/supabase/admin';
import { resolveApiKey, corsJson, corsOptionsResponse, unauthorized } from '@/lib/api/auth';

export async function OPTIONS() {
  return corsOptionsResponse();
}

const SELECT = 'id, project_id, title, description_text, status, priority, assignee_id, due_date, created_at, updated_at';

// GET /api/v1/tasks/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();
  const { id } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin.from('tasks').select(SELECT).eq('id', id).eq('workspace_id', ctx.workspaceId).maybeSingle();
  if (error) {
    console.error('[GET /api/v1/tasks/:id]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  if (!data) return corsJson({ error: 'Task not found' }, { status: 404 });
  return corsJson({ data });
}

// PATCH /api/v1/tasks/:id — update any subset of
// { title, status, priority, due_date, assignee_id, description }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();
  const { id } = await params;

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
  const { data, error } = await admin
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId)
    .select(SELECT)
    .maybeSingle();

  if (error) {
    console.error('[PATCH /api/v1/tasks/:id]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  if (!data) return corsJson({ error: 'Task not found' }, { status: 404 });
  return corsJson({ data });
}

// DELETE /api/v1/tasks/:id
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();
  const { id } = await params;

  const admin = createAdminClient();
  const { error, count } = await admin
    .from('tasks')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) {
    console.error('[DELETE /api/v1/tasks/:id]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  if (!count) return corsJson({ error: 'Task not found' }, { status: 404 });
  return corsJson({ data: { deleted: true } });
}
