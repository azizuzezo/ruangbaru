'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, LogIn } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';

type State =
  | { kind: 'loading' }
  | { kind: 'needs-auth' }
  | { kind: 'accepting' }
  | { kind: 'error'; message: string }
  | { kind: 'done' };

export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const t = useT('auth');
  const tc = useT('common');
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ kind: 'needs-auth' });
        return;
      }
      setState({ kind: 'accepting' });
      const { data, error } = await supabase.rpc('accept_invitation', { invite_token: token });
      if (error) {
        setState({ kind: 'error', message: translateError(error.message, t, tc('errorContactSupport')) });
        return;
      }
      setState({ kind: 'done' });
      // Resolve the workspace slug we just joined and forward there.
      const { data: ws } = await supabase
        .from('workspaces')
        .select('slug')
        .eq('id', data as string)
        .single();
      setTimeout(() => router.replace(ws?.slug ? `/${ws.slug}/dashboard` : '/dashboard'), 900);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <LanguageSwitcher className="absolute right-4 top-4 sm:right-6 sm:top-6" />
      <div className="w-full max-w-sm text-center space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm animate-fade-in-up">
        <Image src="/logo.png" alt={t('logoAltText')} width={48} height={48} className="rounded-xl mx-auto" />

        {(state.kind === 'loading' || state.kind === 'accepting') && (
          <div className="space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">{t('processingInviteText')}</p>
          </div>
        )}

        {state.kind === 'needs-auth' && (
          <div className="space-y-4">
            <h1 className="font-display text-lg font-bold text-foreground">{t('invitedHeading')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('invitedSubtext')}
            </p>
            <Link href={`/login?redirectTo=/invite/${token}`}>
              <Button className="w-full gap-2"><LogIn className="h-4 w-4" /> {t('loginToJoinButton')}</Button>
            </Link>
            <Link href={`/register?redirectTo=/invite/${token}`} className="block text-xs text-primary hover:underline">
              {t('noAccountSignupLink')}
            </Link>
          </div>
        )}

        {state.kind === 'done' && (
          <div className="space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h1 className="font-display text-lg font-bold text-foreground">{t('joinedSuccessHeading')}</h1>
            <p className="text-sm text-muted-foreground">{t('redirectingToWorkspaceText')}</p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="space-y-4">
            <XCircle className="h-8 w-8 text-destructive mx-auto" />
            <h1 className="font-display text-lg font-bold text-foreground">{t('inviteInvalidHeading')}</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">{t('goToDashboardButton')}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function translateError(message: string, t: (key: string) => string, fallback: string): string {
  if (message.includes('expired')) return t('tokenInviteExpiredError');
  if (message.includes('already accepted')) return t('inviteAlreadyAcceptedError');
  if (message.includes('different email')) return t('inviteDifferentEmailError');
  if (message.includes('not found')) return t('inviteNotFoundShortError');
  return fallback;
}
