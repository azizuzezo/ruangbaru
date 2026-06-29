import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@/lib/supabase/server';

/**
 * Issues a short-lived LiveKit access token for a meeting room.
 *
 * Security:
 *  - LIVEKIT_API_KEY / LIVEKIT_API_SECRET live only on the server.
 *  - The caller must be authenticated AND a member of the meeting's workspace.
 *  - If LiveKit isn't configured yet, returns 503 { error: 'not_configured' }
 *    so the client can show a friendly "meetings not enabled" state.
 */
export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let room: string | undefined;
  try {
    const body = await req.json();
    room = typeof body?.room === 'string' ? body.room : undefined;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!room) return NextResponse.json({ error: 'missing_room' }, { status: 400 });

  // Authenticate the caller.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Verify the meeting exists and the user is a member of its workspace.
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, workspace_id')
    .eq('room_name', room)
    .single();
  if (!meeting) return NextResponse.json({ error: 'meeting_not_found' }, { status: 404 });

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', meeting.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Build the token.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const at = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.full_name || user.email || 'Anggota',
    ttl: '2h',
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, url });
}
