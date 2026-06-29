import { NextResponse } from 'next/server';
import { isGoogleConfigured } from '@/lib/google/config';
import { exchangeCode } from '@/lib/google/calendar';
import { createClient } from '@/lib/supabase/server';

/** OAuth redirect target. Stores tokens on google_calendar_accounts. */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(`${appUrl}/?google=not_configured`);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  let returnTo = '/';
  try {
    if (stateRaw) returnTo = JSON.parse(Buffer.from(stateRaw, 'base64url').toString()).returnTo || '/';
  } catch { /* ignore malformed state */ }

  if (!code) return NextResponse.redirect(`${appUrl}${returnTo}?google=error`);

  const tokens = await exchangeCode(code);
  if (!tokens) return NextResponse.redirect(`${appUrl}${returnTo}?google=error`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  // Pull the verified email out of the id_token (JWT) payload, best-effort.
  let email: string | null = null;
  try {
    if (tokens.id_token) {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString());
      email = payload.email ?? null;
    }
  } catch { /* ignore */ }

  await supabase.from('google_calendar_accounts').upsert(
    {
      user_id: user.id,
      google_email: email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      sync_enabled: true,
    },
    { onConflict: 'user_id' },
  );

  return NextResponse.redirect(`${appUrl}${returnTo}?google=connected`);
}
