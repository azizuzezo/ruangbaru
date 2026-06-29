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

    const { data: workspaces, error } = await admin
      .from('workspaces')
      .select(`
        id, name, slug, plan, created_at,
        owner:profiles!owner_id (id, full_name, email),
        member_count:workspace_members(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ workspaces });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
