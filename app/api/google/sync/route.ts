import { NextResponse } from 'next/server';
import { isGoogleConfigured } from '@/lib/google/config';
import {
  freshAccessToken, pullChanges, pushEvent, googleToLocal,
  type GoogleAccountRow,
} from '@/lib/google/calendar';
import { createClient } from '@/lib/supabase/server';
import type { CalendarEvent } from '@/types';

/**
 * Two-way sync for the calling user against a target workspace.
 *   1. Pull: apply Google changes (incremental via syncToken) into calendar_events.
 *   2. Push: send local events authored by this user that lack a google_event_id.
 * Guarded: 503 until Google OAuth is configured.
 */
export async function POST(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let workspaceId: string | undefined;
  try {
    const body = await req.json();
    workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : undefined;
  } catch { /* allow empty body */ }
  if (!workspaceId) return NextResponse.json({ error: 'missing_workspace' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: account } = await supabase
    .from('google_calendar_accounts')
    .select('user_id, access_token, refresh_token, token_expiry, calendar_id, sync_token')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!account) return NextResponse.json({ error: 'not_connected' }, { status: 409 });

  const acc = account as GoogleAccountRow;
  const fresh = await freshAccessToken(acc);
  if (!fresh) return NextResponse.json({ error: 'token_error' }, { status: 401 });
  if (fresh.refreshed) {
    await supabase.from('google_calendar_accounts')
      .update(fresh.refreshed).eq('user_id', user.id);
  }

  let pulled = 0, pushed = 0;

  // ── 1. Pull ────────────────────────────────────────────────────────────────
  const result = await pullChanges(fresh.token, acc.calendar_id, acc.sync_token);
  const syncToken = result.fullResyncRequired ? null : acc.sync_token;
  for (const g of result.events) {
    if (g.status === 'cancelled') {
      await supabase.from('calendar_events').delete()
        .eq('created_by', user.id).eq('google_event_id', g.id);
      pulled++;
      continue;
    }
    const local = googleToLocal(g, workspaceId, user.id);
    if (!local) continue;
    await supabase.from('calendar_events').upsert(
      { ...local, google_calendar_id: acc.calendar_id },
      { onConflict: 'created_by,google_event_id' },
    );
    pulled++;
  }
  if (result.nextSyncToken) {
    await supabase.from('google_calendar_accounts')
      .update({ sync_token: result.nextSyncToken }).eq('user_id', user.id);
  } else if (result.fullResyncRequired) {
    await supabase.from('google_calendar_accounts')
      .update({ sync_token: null }).eq('user_id', user.id);
  }

  // ── 2. Push (local-only events authored by this user) ────────────────────────
  const { data: localEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('created_by', user.id)
    .is('google_event_id', null);

  for (const e of (localEvents as CalendarEvent[] | null) || []) {
    const res = await pushEvent(fresh.token, acc.calendar_id, e);
    if (res) {
      await supabase.from('calendar_events')
        .update({ google_event_id: res.id, google_etag: res.etag ?? null, google_calendar_id: acc.calendar_id })
        .eq('id', e.id);
      pushed++;
    }
  }

  return NextResponse.json({ ok: true, pulled, pushed, fullResync: result.fullResyncRequired, syncToken });
}
