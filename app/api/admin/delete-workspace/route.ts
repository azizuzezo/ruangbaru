import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAILS = ['aziz@duacincin.id', 'aziz@skor.co'];

export async function POST(req: NextRequest) {
  // Authenticate requesting user
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { workspaceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspaceId } = body;

  if (!workspaceId || typeof workspaceId !== 'string') {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)
      .select('id, name, slug')
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, workspace: data });
  } catch (err: any) {
    console.error('[POST /api/admin/delete-workspace]', err);
    return NextResponse.json({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
}
