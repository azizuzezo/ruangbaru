import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  googleConfigured, refreshToken, listEvents, createEvent, googleToLocal, localToGoogle,
} from '@/lib/google/calendar';

/** Two-way sync between RuangBaru events and the user's Google Calendar. */
export async function POST(req: Request) {
  if (!googleConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let workspaceId: string | undefined;
  try {
    const body = await req.json();
    workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id : undefined;
  } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  if (!workspaceId) return NextResponse.json({ error: 'missing_workspace' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: conn } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 400 });

  // Ensure a valid access token.
  let accessToken: string = conn.access_token;
  const expired = !conn.token_expiry || new Date(conn.token_expiry).getTime() < Date.now() + 60_000;
  if (expired) {
    if (!conn.refresh_token) return NextResponse.json({ error: 'reconnect_required' }, { status: 400 });
    try {
      const r = await refreshToken(conn.refresh_token);
      accessToken = r.access_token;
      await supabase.from('google_calendar_connections').update({
        access_token: r.access_token,
        token_expiry: new Date(Date.now() + (r.expires_in || 3600) * 1000).toISOString(),
      }).eq('id', conn.id);
    } catch {
      return NextResponse.json({ error: 'reconnect_required' }, { status: 400 });
    }
  }

  const calId = conn.calendar_id || 'primary';
  const timeMin = new Date(Date.now() - 7 * 864e5).toISOString();
  const timeMax = new Date(Date.now() + 60 * 864e5).toISOString();
  const nowIso = new Date().toISOString();

  let pulled = 0;
  let pushed = 0;

  try {
    // ── PULL: Google → RuangBaru ──────────────────────────────────────────
    const gEvents = await listEvents(accessToken, calId, timeMin, timeMax);
    const { data: existing } = await supabase
      .from('events')
      .select('id, google_event_id')
      .eq('workspace_id', workspaceId)
      .not('google_event_id', 'is', null);
    const byGid = new Map<string, string>();
    for (const e of existing || []) if (e.google_event_id) byGid.set(e.google_event_id, e.id);

    const inserts: Record<string, unknown>[] = [];
    for (const g of gEvents) {
      if (g.status === 'cancelled') continue;
      const loc = googleToLocal(g);
      if (!loc) continue;
      const existingId = byGid.get(g.id);
      if (existingId) {
        await supabase.from('events').update({
          title: loc.title, description: loc.description, location: loc.location,
          start_at: loc.start_at, end_at: loc.end_at, all_day: loc.all_day, synced_at: nowIso,
        }).eq('id', existingId);
        pulled++;
      } else {
        inserts.push({
          ...loc, workspace_id: workspaceId, created_by: user.id,
          color: '#10B29F', recurrence: 'none', synced_at: nowIso,
        });
      }
    }
    if (inserts.length) { await supabase.from('events').insert(inserts); pulled += inserts.length; }

    // ── PUSH: RuangBaru → Google (events created here, not yet synced) ─────
    const { data: localOnly } = await supabase
      .from('events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('google_event_id', null)
      .gte('start_at', timeMin)
      .lte('start_at', timeMax)
      .limit(50);

    for (const ev of localOnly || []) {
      try {
        const created = await createEvent(accessToken, calId, localToGoogle(ev));
        if (created?.id) {
          await supabase.from('events').update({ google_event_id: created.id, synced_at: nowIso }).eq('id', ev.id);
          pushed++;
        }
      } catch { /* skip individual failures */ }
    }

    await supabase.from('google_calendar_connections').update({ last_synced_at: nowIso }).eq('id', conn.id);
    return NextResponse.json({ ok: true, pulled, pushed });
  } catch {
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 });
  }
}
