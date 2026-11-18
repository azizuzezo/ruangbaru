import { createAdminClient } from '@/lib/supabase/admin';
import { resolveApiKey, corsJson, corsOptionsResponse, unauthorized } from '@/lib/api/auth';

// `creator` is who created the project (for projects created through the API,
// the admin who owns the API key).
const PROJECT_SELECT = 'id, name, description, color, icon, status, created_by, created_at, updated_at, creator:created_by(id, full_name, email)';

export async function OPTIONS() {
  return corsOptionsResponse();
}

// GET /api/v1/projects — list this workspace's projects.
export async function GET(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/v1/projects]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  return corsJson({ data });
}

// POST /api/v1/projects — create a project. Body: { name, description?, color? }
export async function POST(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
    return corsJson({ error: '"name" is required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('projects')
    .insert({
      workspace_id: ctx.workspaceId,
      name: body.name.trim(),
      description: typeof body.description === 'string' ? body.description : null,
      color: typeof body.color === 'string' ? body.color : '#106CD8',
      status: 'active',
      created_by: ctx.createdBy,
    })
    .select(PROJECT_SELECT)
    .single();

  if (error) {
    console.error('[POST /api/v1/projects]', error);
    return corsJson({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
  return corsJson({ data }, { status: 201 });
}
