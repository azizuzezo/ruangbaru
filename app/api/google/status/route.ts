import { NextResponse } from 'next/server';
import { isGoogleConfigured } from '@/lib/google/config';
import { createClient } from '@/lib/supabase/server';

/** Reports whether Google sync is available (server configured) and connected. */
export async function GET() {
  const configured = isGoogleConfigured();
  if (!configured) return NextResponse.json({ configured: false, connected: false });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ configured, connected: false });

  const { data } = await supabase
    .from('google_calendar_accounts')
    .select('google_email, sync_enabled, channel_expiry')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    configured,
    connected: Boolean(data),
    email: data?.google_email ?? null,
    syncEnabled: data?.sync_enabled ?? false,
  });
}
