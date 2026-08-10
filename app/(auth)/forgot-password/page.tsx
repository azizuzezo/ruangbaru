'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

function getForgotPasswordSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().email(t('emailInvalidError')),
  });
}

type ForgotPasswordFormValues = { email: string };

export default function ForgotPasswordPage() {
  const t = useT('auth');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(getForgotPasswordSchema(t)),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      // Always show success to avoid email enumeration
      setSuccessMsg(t('forgotPasswordSuccessMessage'));
      toast.success(t('forgotPasswordSuccessToast'));
    } catch {
      toast.error(t('genericErrorToast'));
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="space-y-4 text-center">
        <div className="h-12 w-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-600 text-2xl">
          🔑
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {t('checkInboxHeading')}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {successMsg}
        </p>
        <div className="pt-4">
          <Link href="/login">
            <Button className="w-full">{t('backToLoginPageButton')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {t('forgotPasswordHeading')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('forgotPasswordSubheading')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            disabled={loading}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('sendingLinkLabel')}
            </>
          ) : (
            t('sendResetLinkButton')
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('rememberPasswordText')}{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t('loginAgainLink')}
        </Link>
      </p>
    </div>
  );
}
