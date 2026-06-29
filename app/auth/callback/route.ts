import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const base =
        process.env.NODE_ENV === 'development'
          ? origin
          : (process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('x-forwarded-host')}` || origin);
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  // Redirect to error page if exchange fails
  const base =
    process.env.NODE_ENV === 'development'
      ? origin
      : (process.env.NEXT_PUBLIC_APP_URL || origin);
  return NextResponse.redirect(`${base}/login?error=auth-code-exchange-failed`);
}
