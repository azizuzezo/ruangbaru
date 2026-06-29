import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPasswordReset, resend } from '@/lib/email/resend';

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Email diperlukan' }, { status: 400 });

  // Always return success to avoid email enumeration
  const successResponse = NextResponse.json({ success: true });

  if (!resend) {
    // Resend not configured — fall back to Supabase mailer silently
    try {
      const admin = createAdminClient();
      await admin.auth.resetPasswordForEmail(email);
    } catch {}
    return successResponse;
  }

  try {
    const admin = createAdminClient();

    // Generate a reset link using the service role (bypasses rate limits + uses our redirect)
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
      },
    });

    if (error || !data?.properties?.action_link) {
      // User may not exist — return success silently anyway
      return successResponse;
    }

    await sendPasswordReset({ to: email, resetLink: data.properties.action_link });
  } catch (err: any) {
    console.error('[forgot-password] Error:', err?.message);
    // Don't leak error details to client
  }

  return successResponse;
}
