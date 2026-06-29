import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';
import { createClient } from '@/lib/supabase/server';

/**
 * Ends a meeting for everyone: marks it ended in the DB and deletes the
 * LiveKit room so all connected participants are disconnected.
 * Only the meeting host (creator) may end it.
 */
export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

  let meetingId: string | undefined;
  try {
    const body = await req.json();
    meetingId = typeof body?.meetingId === 'string' ? body.meetingId : undefined;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!meetingId) return NextResponse.json({ error: 'missing_meeting' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, room_name, created_by')
    .eq('id', meetingId)
    .single();
  if (!meeting) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (meeting.created_by !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Mark ended.
  await supabase.from('meetings').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', meeting.id);

  // Disconnect everyone by deleting the LiveKit room (best-effort).
  if (apiKey && apiSecret && url) {
    try {
      const httpUrl = url.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
      const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret);
      await svc.deleteRoom(meeting.room_name);
    } catch {
      /* room may not exist if no one connected — ignore */
    }
  }

  return NextResponse.json({ ok: true });
}
