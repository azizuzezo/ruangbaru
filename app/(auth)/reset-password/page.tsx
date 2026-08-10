'use client';

import Link from 'next/link';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

function getSchema(t: (key: string) => string) {
  return z.object({
    password: z.string().min(8, t('passwordMin8Error')),
    confirm: z.string(),
  }).refine((d) => d.password === d.confirm, {
    message: t('passwordNoMatchError'),
    path: ['confirm'],
  });
}

type FormValues = { password: string; confirm: string };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const t = useT('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const supabase = createClient();

  // The auth callback exchanges the code; by the time this page loads
  // Supabase should have a valid session for the password update.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        toast.error(t('resetLinkInvalidToast'));
        router.replace('/forgot-password');
      }
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(getSchema(t)),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast.error(error.message || t('resetPasswordFailToast'));
      setLoading(false);
    } else {
      setDone(true);
      toast.success(t('resetPasswordSuccessToast'));
      // Sign out so user logs in fresh
      await supabase.auth.signOut();
      setTimeout(() => router.push('/login'), 2500);
    }
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="h-14 w-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-7 w-7 text-emerald-500" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {t('resetPasswordDoneHeading')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('resetPasswordRedirectText')}
        </p>
        <Link href="/login">
          <Button className="w-full mt-4">{t('loginNowButton')}</Button>
        </Link>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('verifyingResetLinkText')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {t('newPasswordHeading')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('newPasswordSubheading')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('newPasswordLabel')}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t('passwordMin8CharsPlaceholder')}
            disabled={loading}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">{t('confirmPasswordFieldLabel')}</Label>
          <Input
            id="confirm"
            type="password"
            placeholder={t('confirmNewPasswordPlaceholder')}
            disabled={loading}
            {...register('confirm')}
          />
          {errors.confirm && (
            <p className="text-xs font-medium text-destructive">{errors.confirm.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('savingLabel')}
            </>
          ) : (
            t('saveNewPasswordButton')
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('rememberOldPasswordText')}{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t('backToLoginLink')}
        </Link>
      </p>
    </div>
  );
}
