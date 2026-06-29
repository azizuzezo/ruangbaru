import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWorkspaceInvitation, resend } from '@/lib/email/resend';

interface InvitePayload {
  email: string;
  token?: string;
}

/**
 * Sends workspace-invitation emails via Resend.
 * Requires an authenticated caller (the inviter). Email sending is best-effort:
 * the invitation row already exists, so a failure here doesn't block onboarding.
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

  let body: { workspaceName: string; inviterName: string; invitations: InvitePayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { workspaceName, inviterName, invitations } = body;
  if (!Array.isArray(invitations) || invitations.length === 0) {
    return NextResponse.json({ error: 'No invitations' }, { status: 400 });
  }

  const results = await Promise.allSettled(
    invitations
      .filter((inv) => inv.email && inv.token)
      .map((inv) =>
        sendWorkspaceInvitation({
          to: inv.email,
          token: inv.token!,
          workspaceName: workspaceName || 'RuangBaru',
          inviterName: inviterName || 'Rekan tim',
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
