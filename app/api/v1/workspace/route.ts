import { createAdminClient } from '@/lib/supabase/admin';
import { resolveApiKey, corsJson, corsOptionsResponse, unauthorized } from '@/lib/api/auth';

export async function OPTIONS() {
  return corsOptionsResponse();
}

// GET /api/v1/workspace — the workspace this API key belongs to.
export async function GET(request: Request) {
  const ctx = await resolveApiKey(request);
  if (!ctx) return unauthorized();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('workspaces')
    .select('id, name, slug, plan, created_at')
    .eq('id', ctx.workspaceId)
    .single();

  if (error || !data) return corsJson({ error: 'Workspace not found' }, { status: 404 });
  return corsJson({ data });
}
