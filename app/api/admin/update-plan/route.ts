import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_EMAILS = ['aziz@duacincin.id', 'aziz@skor.co'];
const VALID_PLANS = ['free', 'pro', 'business', 'enterprise'] as const;

export async function POST(req: NextRequest) {
  // Authenticate requesting user
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { workspaceId?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { workspaceId, plan } = body;

  if (!workspaceId || typeof workspaceId !== 'string') {
    return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
  }
  if (!plan || !VALID_PLANS.includes(plan as any)) {
    return NextResponse.json({ error: `plan must be one of: ${VALID_PLANS.join(', ')}` }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('workspaces')
      .update({ plan })
      .eq('id', workspaceId)
      .select('id, name, plan')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, workspace: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
