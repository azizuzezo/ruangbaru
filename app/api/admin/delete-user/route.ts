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

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account from here' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Hard-deletes the auth.users row; ON DELETE CASCADE on profiles.id and
    // workspaces.owner_id takes care of the profile and any workspaces this
    // user owns (plus everything scoped to those workspaces).
    const { error } = await admin.auth.admin.deleteUser(userId, false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/admin/delete-user]', err);
    return NextResponse.json({ error: 'Internal server error. Please contact support.' }, { status: 500 });
  }
}
