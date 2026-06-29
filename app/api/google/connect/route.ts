import { NextResponse } from 'next/server';
import { isGoogleConfigured, googleAuthUrl } from '@/lib/google/config';
import { createClient } from '@/lib/supabase/server';

/** Kicks off Google OAuth. Guarded: 503 until GOOGLE_CLIENT_ID/SECRET exist. */
export async function GET(req: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Carry the return path so the callback can send the user back where they were.
  const url = new URL(req.url);
  const returnTo = url.searchParams.get('returnTo') || '/';
  const state = Buffer.from(JSON.stringify({ uid: user.id, returnTo })).toString('base64url');

  return NextResponse.redirect(googleAuthUrl(state));
}
