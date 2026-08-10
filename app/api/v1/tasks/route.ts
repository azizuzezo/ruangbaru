import { createAdminClient } from '@/lib/supabase/admin';
import { resolveApiKey, corsJson, corsOptionsResponse, unauthorized } from '@/lib/api/auth';

export async function OPTIONS() {
  return corsOptionsResponse();
}

// GET /api/v1/tasks — list this workspace's tasks. Optional ?project_id=,
// ?status= query params filter the result.
export async function GET(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();

  const url = new URL(request.url);
  const projectId = url.searchParams.get('project_id');
  const status = url.searchParams.get('status');

  const admin = createAdminClient();
  let query = admin
    .from('tasks')
    .select('id, project_id, title, description_text, status, priority, assignee_id, due_date, created_at, updated_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (projectId) query = query.eq('project_id', projectId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/v1/tasks]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  return corsJson({ data });
}

// POST /api/v1/tasks — create a task.
// Body: { title, project_id, status?, priority?, due_date?, assignee_id?, description? }
export async function POST(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
    return corsJson({ error: '"title" is required' }, { status: 400 });
  }
  if (!body?.project_id || typeof body.project_id !== 'string') {
    return corsJson({ error: '"project_id" is required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Confirm the project actually belongs to this key's workspace — without
  // this check, a key could plant tasks in another workspace's project by
  // guessing its id.
  const { data: project } = await admin
    .from('projects')
    .select('id')
    .eq('id', body.project_id)
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();
  if (!project) return corsJson({ error: 'project_id not found in this workspace' }, { status: 404 });

  const { data, error } = await admin
    .from('tasks')
    .insert({
      workspace_id: ctx.workspaceId,
      project_id: body.project_id,
      title: body.title.trim(),
      status: typeof body.status === 'string' ? body.status : 'backlog',
      priority: typeof body.priority === 'string' ? body.priority : 'no_priority',
      due_date: typeof body.due_date === 'string' ? body.due_date : null,
      assignee_id: typeof body.assignee_id === 'string' ? body.assignee_id : null,
      description_text: typeof body.description === 'string' ? body.description : null,
    })
    .select('id, project_id, title, description_text, status, priority, assignee_id, due_date, created_at, updated_at')
    .single();

  if (error) {
    console.error('[POST /api/v1/tasks]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  return corsJson({ data }, { status: 201 });
}
