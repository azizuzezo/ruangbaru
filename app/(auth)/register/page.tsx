'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signUp } from '@/lib/supabase/actions';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, ArrowRight, Check, X, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n/useT';

const BLUE = '#106CD8';
const E    = [0.22, 1, 0.36, 1] as [number, number, number, number];

function getSchema(t: (key: string) => string) {
  return z
    .object({
      email:           z.string().email(t('emailInvalidError')),
      password:        z.string().min(6, t('passwordMin6Error')),
      confirmPassword: z.string().min(1, t('confirmPasswordRequiredError')),
    })
    .refine((v) => v.password === v.confirmPassword, {
      message: t('passwordMismatchError'),
      path: ['confirmPassword'],
    });
}
type Values = { email: string; password: string; confirmPassword: string };

function StrengthBar({ password }: { password: string }) {
  const len = password.length;
  const strength = len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : len < 14 ? 3 : 4;
  const colors = ['bg-neutral-200', 'bg-red-400', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];
  if (!len) return null;
  return (
    <div className="mt-2 flex gap-1">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-200 ${i < strength ? colors[strength] : 'bg-neutral-100'}`} />
      ))}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const t = useT('auth');
  const searchParams = useSearchParams();
  // Preserved through signup → email confirmation → /auth/callback, so a
  // user who registers via an invitation link lands directly in that
  // workspace instead of the generic onboarding wizard.
  const redirectTo = searchParams.get('redirectTo') || '';

  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(getSchema(t)),
    mode: 'onTouched',
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const pw = watch('password');
  const pw2 = watch('confirmPassword');
  const pwMatch = pw2.length > 0 && pw === pw2;
  const pwMismatch = pw2.length > 0 && pw !== pw2;

  const onSubmit = async (data: Values) => {
    setLoading(true);
    const fd = new FormData();
    fd.append('email', data.email);
    fd.append('password', data.password);
    if (redirectTo) fd.append('next', redirectTo);
    // No full_name / workspace_name here on purpose — collected right
    // after first login, at the point the user actually creates their
    // first workspace (see app/welcome/page.tsx).
    try {
      const result = await signUp(fd);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        setSuccessMsg(result.success);
      }
    } catch {
      toast.error(t('genericErrorToast'));
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <motion.div className="space-y-6 text-center"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: E }}>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50"
        >
          <Mail className="h-6 w-6 text-neutral-700" />
        </motion.div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t('checkEmailHeading')}</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{successMsg}</p>
        </div>
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 text-left">
          <p className="text-xs text-neutral-500">{t('noEmailReceivedText')}{' '}
            <a href="mailto:halo@ruangbaru.my.id" className="font-medium underline underline-offset-2" style={{ color: BLUE }}>
              halo@ruangbaru.my.id
            </a>
          </p>
        </div>
        <Link href="/login">
          <motion.button className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 shadow-sm"
            whileHover={{ borderColor: '#9CA3AF' }} whileTap={{ scale: 0.97 }}>
            {t('backToLoginButton')}
          </motion.button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-6"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: E }}>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {t('registerHeading')}
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          {t('registerSubheading')}
        </p>
      </div>

      {/* What happens next — sets expectations since name/workspace aren't asked here */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: E }}
        className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3"
      >
        <FolderKanban className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BLUE }} />
        <p className="text-xs leading-5 text-neutral-600">
          {t('registerInfoBox')}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1, ease: E }}>
          <label htmlFor="reg-email" className="mb-1.5 block text-sm font-semibold text-neutral-700">{t('emailLabel')}</label>
          <input
            id="reg-email"
            type="email"
            placeholder={t('emailPlaceholder')}
            disabled={loading}
            autoFocus
            {...register('email')}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-[#106CD8] focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          />
          <AnimatePresence>
            {errors.email && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-1 text-xs text-red-500">
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15, ease: E }}>
          <label htmlFor="reg-password" className="mb-1.5 block text-sm font-semibold text-neutral-700">{t('passwordLabel')}</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPw ? 'text' : 'password'}
              placeholder={t('passwordMinCharsPlaceholder')}
              disabled={loading}
              {...register('password')}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-3.5 pr-10 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-[#106CD8] focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <StrengthBar password={pw} />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </motion.div>

        {/* Confirm password */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2, ease: E }}>
          <label htmlFor="reg-password-2" className="mb-1.5 block text-sm font-semibold text-neutral-700">{t('confirmPasswordLabel')}</label>
          <div className="relative">
            <input
              id="reg-password-2"
              type={showPw2 ? 'text' : 'password'}
              placeholder={t('confirmPasswordPlaceholder')}
              disabled={loading}
              {...register('confirmPassword')}
              className={`w-full rounded-lg border bg-white py-2.5 pl-3.5 pr-16 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:ring-2 disabled:opacity-60 ${
                pwMismatch ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                : pwMatch ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                : 'border-neutral-200 focus:border-[#106CD8] focus:ring-blue-100'
              }`}
            />
            <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              <AnimatePresence>
                {pwMatch && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-3 w-3 text-white" />
                  </motion.span>
                )}
                {pwMismatch && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                    <X className="h-3 w-3 text-white" />
                  </motion.span>
                )}
              </AnimatePresence>
              <button type="button" onClick={() => setShowPw2(v => !v)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors">
                {showPw2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </motion.div>

        <motion.button
          type="submit"
          disabled={loading}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.26, ease: E }}
          whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-colors disabled:opacity-60"
          style={{ background: BLUE }}>
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('registerSubmittingLabel')}</>
            : <>{t('registerSubmitLabel')} <ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </form>

      {/* Terms note */}
      <p className="text-center text-xs text-neutral-400 leading-5">
        {t('termsAgreementPrefix')}{' '}
        <Link href="/terms-of-service" className="underline underline-offset-2 hover:text-neutral-600">{t('termsOfServiceLink')}</Link>
        {' '}{t('andConnector')}{' '}
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-neutral-600">{t('privacyPolicyLink')}</Link>{' '}{t('termsAgreementSuffix')}
      </p>

      {/* Login link */}
      <p className="text-center text-sm text-neutral-500">
        {t('haveAccountText')}{' '}
        <Link
          href={redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : '/login'}
          className="font-semibold transition-colors hover:opacity-80"
          style={{ color: BLUE }}
        >
          {t('loginHereLink')}
        </Link>
      </p>
    </motion.div>
  );
}
