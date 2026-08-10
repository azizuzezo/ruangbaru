'use client';

import Link from 'next/link';
import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/supabase/actions';
import { toast } from 'sonner';
import { Loader2, Check, ArrowRight, Eye, EyeOff, KeyRound, CornerDownLeft } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';

const BLUE = '#106CD8';
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

function getLoginSchema(t: (key: string) => string) {
  return z.object({
    email:    z.string().email(t('emailInvalidError')),
    password: z.string().min(6, t('passwordMin6Error')),
  });
}
type LoginFormValues = { email: string; password: string };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useT('auth');
  const [loading,   setLoading]   = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [capsOn,    setCapsOn]    = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get('redirectTo') || '/dashboard';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(getLoginSchema(t)),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const emailVal    = watch('email');
  const passwordVal = watch('password');
  const emailValid    = !errors.email    && emailVal.length > 4    && emailVal.includes('@');
  const passwordValid = !errors.password && passwordVal.length >= 6;

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    const fd = new FormData();
    fd.append('email', data.email);
    fd.append('password', data.password);
    fd.append('redirectTo', redirectTo);
    try {
      const result = await signIn(fd);
      if (result?.error) { toast.error(result.error); setLoading(false); }
    } catch (err: any) {
      if (err?.digest?.startsWith('NEXT_REDIRECT')) return;
      toast.error(t('loginErrorToast'));
      setLoading(false);
    }
  };

  const checkCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsOn(e.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: E }}
      className="space-y-6"
    >
      {/* Heading */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
          {t('loginHeading')}
        </h1>
        <p className="text-sm text-neutral-500">
          {t('loginSubheading')}
        </p>
      </div>

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06, ease: E }}
          className="space-y-1.5"
        >
          <Label htmlFor="email" className="text-sm font-semibold text-neutral-700">{t('emailLabel')}</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              disabled={loading}
              autoFocus
              className={`h-11 pr-9 transition-all border-neutral-200 focus:border-[#106CD8] focus:ring-2 focus:ring-blue-100 ${
                errors.email
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : emailValid
                  ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                  : ''
              }`}
              {...register('email')}
            />
            <AnimatePresence>
              {emailValid && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs font-medium text-red-500"
              >
                {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12, ease: E }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-neutral-700">{t('passwordLabel')}</Label>
            <Link href="/forgot-password" className="text-xs font-semibold text-[#106CD8] hover:text-[#0D59B4]">
              {t('forgotPasswordLink')}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              placeholder={t('passwordPlaceholderDots')}
              disabled={loading}
              onKeyUp={checkCaps}
              onKeyDown={checkCaps}
              className={`h-11 pr-9 transition-all border-neutral-200 focus:border-[#106CD8] focus:ring-2 focus:ring-blue-100 ${
                errors.password
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : passwordValid
                  ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                  : ''
              }`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <AnimatePresence>
            {capsOn && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-600"
              >
                <KeyRound className="h-3 w-3" /> {t('capsLockActiveText')}
              </motion.p>
            )}
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs font-medium text-red-500"
              >
                {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18, ease: E }}
        >
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="group flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-[#106CD8] text-white text-sm font-semibold shadow-sm shadow-blue-200 transition-colors hover:bg-[#0D59B4] disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('loginSubmittingLabel')}</>
            ) : (
              <>
                {t('loginSubmitLabel')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
          <p className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-neutral-400">
            <CornerDownLeft className="h-3 w-3" /> {t('pressEnterHint')}
          </p>
        </motion.div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3, ease: E }}
        className="text-center text-sm text-neutral-500"
      >
        {t('noAccountText')}{' '}
        <Link href="/register" className="font-semibold text-[#106CD8] hover:text-[#0D59B4] transition-colors">
          {t('signUpFreeLink')}
        </Link>
      </motion.p>
    </motion.div>
  );
}
