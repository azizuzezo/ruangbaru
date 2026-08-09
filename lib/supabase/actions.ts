'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resend, sendConfirmationEmail } from '@/lib/email/resend';
import { headers } from 'next/headers';

async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  const redirectTo = (formData.get('redirectTo') as string) || '/dashboard';
  revalidatePath('/', 'layout');
  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;
  const workspaceName = formData.get('workspace_name') as string | null;
  // Set when registering via an invitation link (e.g. "/invite/<token>") so
  // the post-confirmation redirect lands the user directly in that
  // workspace instead of the generic onboarding wizard.
  const next = formData.get('next') as string | null;

  const origin = await getOrigin();
  const redirectTo = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  const userData = {
    full_name: fullName,
    ...(workspaceName ? { workspace_name: workspaceName } : {}),
  };

  // Preferred path: mint the confirmation link ourselves and send it via Resend,
  // so the "from" address and branding match our other transactional emails
  // instead of Supabase's default mailer.
  if (resend && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { data: userData, redirectTo },
    });

    if (error) {
      return { error: error.message };
    }

    const confirmLink = data.properties?.action_link;
    if (!confirmLink) {
      return { error: 'Gagal membuat tautan konfirmasi.' };
    }

    try {
      await sendConfirmationEmail({ to: email, fullName, confirmLink });
    } catch (e) {
      console.error('[signUp] Resend confirmation email failed:', e);
      return { error: 'Gagal mengirim email konfirmasi. Coba lagi.' };
    }

    return { success: 'Check your email to confirm your account.' };
  }

  // Fallback: Resend/service role not configured, let Supabase send its own email.
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: userData, emailRedirectTo: redirectTo },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Check your email to confirm your account.' };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;

  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Password reset email sent. Check your inbox.' };
}

export async function signInWithGoogle(next?: string) {
  const supabase = await createClient();

  const origin = await getOrigin();
  const callback = `${origin}/auth/callback`;
  const redirectTo = next ? `${callback}?next=${encodeURIComponent(next)}` : callback;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
}
