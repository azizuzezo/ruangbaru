import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMentionEmail, sendTaskActivityEmail, resend } from '@/lib/email/resend';
import { taskPath, taskRef } from '@/lib/tasks/meta';

/**
 * Sends collaboration emails (mentions, replies, status changes) for a task.
 *
 * Nothing identifying is trusted from the client: the actor is read from the
 * session, the link to the task's own page is built from the workspace slug and
 * the task number in the DB (the task must belong to that workspace), and
 * recipient addresses come from profiles that must belong to the same
 * workspace. The caller must be a member of that workspace.
 */
type Kind = 'mention' | 'comment' | 'status';

interface Payload {
  workspaceId?: string;
  taskId?: string;
  recipientIds?: string[];
  kind?: Kind;
  taskTitle?: string;
  detail?: string;
  location?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!resend) return NextResponse.json({ sent: 0, skipped: true });

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const workspaceId = body.workspaceId;
  const kind = body.kind;
  const taskTitle = typeof body.taskTitle === 'string' ? body.taskTitle.trim().slice(0, 300) : '';
  const recipientIds = [...new Set((body.recipientIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0))]
    .filter((id) => id !== user.id)
    .slice(0, 20);

  if (!workspaceId || !body.taskId || !taskTitle || !['mention', 'comment', 'status'].includes(kind ?? '') || recipientIds.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Caller must be a member of the workspace the task belongs to.
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('slug')
    .eq('id', workspaceId)
    .maybeSingle();
  const { data: actor } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  // The task must belong to this workspace; its number gives it its own link.
  const { data: taskRow } = await supabase
    .from('tasks')
    .select('task_number, title')
    .eq('id', body.taskId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!taskRow) return NextResponse.json({ sent: 0 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const link = `${appUrl}${taskPath(workspace?.slug || workspaceId, taskRow.task_number)}`;
  // "#12 Judul tugas", so the number shows up in the subject and body.
  const ref = taskRef(taskRow.task_number);
  const labelledTitle = ref ? `${ref} ${taskTitle}` : taskTitle;
  const actorName = actor?.full_name || actor?.email || 'Rekan tim';

  // Only profiles of members of THIS workspace can receive mail.
  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .in('user_id', recipientIds);
  const allowedIds = new Set(((memberRows ?? []) as Array<{ user_id: string }>).map((m) => m.user_id));
  const allowedRecipients = recipientIds.filter((id) => allowedIds.has(id));
  if (allowedRecipients.length === 0) return NextResponse.json({ sent: 0 });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', allowedRecipients);

  const detail = typeof body.detail === 'string' ? body.detail.slice(0, 500) : undefined;
  const finalKind = kind as Kind;
  const results = await Promise.allSettled(
    ((profiles ?? []) as Array<{ id: string; email: string }>)
      .filter((p) => p.email)
      .map((p) =>
        kind === 'mention'
          ? sendMentionEmail({
              to: p.email,
              actorName,
              taskTitle: labelledTitle,
              location: body.location === 'comment' ? 'komentar' : 'deskripsi tugas',
              link,
            })
          : sendTaskActivityEmail({
              to: p.email,
              actorName,
              taskTitle: labelledTitle,
              kind: finalKind,
              detail,
              link,
            })
      )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length) console.error('[notifications/email] Resend errors:', failures.map((r) => r.reason));

  return NextResponse.json({ sent, failed: failures.length });
}
