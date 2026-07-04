import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWorkspaceInvitation, resend } from '@/lib/email/resend';

interface InvitePayload {
  token?: string;
}

interface InvitationRow {
  email: string;
  token: string;
  workspace_id: string;
  workspace: { name: string } | null;
}

interface MemberRow {
  workspace_id: string;
  role: string;
}

/**
 * Sends workspace-invitation emails via Resend.
 *
 * Only trusts invitation tokens: email, workspace name, and inviter name are
 * always read back from the database, never from the request body, and RLS
 * ("Members can view invitations for their workspace") means a caller who
 * isn't a member of the invitation's workspace can't even see the row. We
 * additionally require the caller to be an admin/owner of that workspace,
 * matching the "Admins can create invitations" policy the row was born under.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!resend) {
    return NextResponse.json({ error: 'Email not configured', sent: 0 }, { status: 200 });
  }

  let body: { invitations: InvitePayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const tokens = Array.isArray(body.invitations)
    ? [...new Set(body.invitations.map((inv) => inv.token).filter((t): t is string => Boolean(t)))]
    : [];
  if (tokens.length === 0) {
    return NextResponse.json({ error: 'No invitations' }, { status: 400 });
  }

  const { data: inviteRows } = await supabase
    .from('workspace_invitations')
    .select('email, token, workspace_id, workspace:workspaces(name)')
    .in('token', tokens)
    .is('accepted_at', null) as { data: InvitationRow[] | null };

  if (!inviteRows || inviteRows.length === 0) {
    return NextResponse.json({ error: 'No pending invitations found for the given tokens' }, { status: 404 });
  }

  const workspaceIds = [...new Set(inviteRows.map((row) => row.workspace_id))];
  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .in('workspace_id', workspaceIds) as { data: MemberRow[] | null };

  const adminWorkspaceIds = new Set(
    (memberRows || [])
      .filter((m) => m.role === 'owner' || m.role === 'admin')
      .map((m) => m.workspace_id)
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single();
  const inviterName = profile?.full_name || profile?.email || 'Rekan tim';

  const sendable = inviteRows.filter((row) => adminWorkspaceIds.has(row.workspace_id));
  if (sendable.length === 0) {
    return NextResponse.json({ error: 'Not an admin of the invitation workspace' }, { status: 403 });
  }

  const results = await Promise.allSettled(
    sendable.map((row) =>
      sendWorkspaceInvitation({
        to: row.email,
        token: row.token,
        workspaceName: row.workspace?.name || 'RuangBaru',
        inviterName,
      })
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason?.message || String(r.reason));

  if (errors.length > 0) console.error('[invitations/send] Resend errors:', errors);

  return NextResponse.json({ sent, failed: errors.length, errors });
}
