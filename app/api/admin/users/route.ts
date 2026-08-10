import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAILS = ['aziz@duacincin.id', 'aziz@skor.co'];

export async function GET() {
  // Authenticate the requesting user via session cookie
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    const { data: profiles, error } = await admin
      .from('profiles')
      .select(`
        id, email, full_name, avatar_url, created_at,
        owned_workspaces:workspaces!owner_id (id, name, slug),
        memberships:workspace_members(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ users: profiles });
  } catch (err: any) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
}
