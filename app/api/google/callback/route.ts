import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { googleConfigured, exchangeCode, getUserEmail, redirectUri } from '@/lib/google/calendar';

/** Google OAuth redirect target: exchanges the code and stores tokens. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  let workspaceSlug = '';
  try { workspaceSlug = JSON.parse(Buffer.from(state || '', 'base64url').toString()).w || ''; } catch { /* ignore */ }
  const back = (status: string) => NextResponse.redirect(new URL(`/${workspaceSlug || 'dashboard'}/calendar?google=${status}`, req.url));

  if (url.searchParams.get('error')) return back('denied');
  if (!code || !googleConfigured()) return back('error');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.url));

  const { data: ws } = await supabase.from('workspaces').select('id').eq('slug', workspaceSlug).single();
  if (!ws) return back('error');

  try {
    const tok = await exchangeCode(code, redirectUri(req));
    const email = await getUserEmail(tok.access_token);
    const expiry = new Date(Date.now() + (tok.expires_in || 3600) * 1000).toISOString();

    const row: Record<string, unknown> = {
      user_id: user.id,
      workspace_id: ws.id,
      google_email: email,
      access_token: tok.access_token,
      token_expiry: expiry,
      updated_at: new Date().toISOString(),
    };
    // Google only returns a refresh_token on first consent — keep the old one otherwise.
    if (tok.refresh_token) row.refresh_token = tok.refresh_token;

    await supabase.from('google_calendar_connections').upsert(row, { onConflict: 'user_id,workspace_id' });
    return back('connected');
  } catch {
    return back('error');
  }
}
