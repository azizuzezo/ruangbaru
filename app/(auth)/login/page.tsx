'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signInWithGoogle } from '@/lib/supabase/actions';
import { toast } from 'sonner';
import { Loader2, Check, ArrowRight, Eye, EyeOff } from 'lucide-react';

const BLUE = '#106CD8';
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

const loginSchema = z.object({
  email:    z.string().email('Masukkan alamat email yang valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw,        setShowPw]        = useState(false);
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get('redirectTo') || '/dashboard';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
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
      else toast.success('Berhasil masuk! Mengarahkan...');
    } catch {
      toast.error('Terjadi kesalahan saat masuk. Coba lagi.');
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle(redirectTo);
      if (result?.error) { toast.error(result.error); setGoogleLoading(false); }
    } catch {
      toast.error('Tidak dapat masuk dengan Google.');
      setGoogleLoading(false);
    }
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
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950">
          Selamat datang kembali 👋
        </h1>
        <p className="text-sm text-neutral-500">
          Masuk ke workspace tim Anda dan langsung bekerja.
        </p>
      </div>

      {/* Google */}
      <Button
        type="button"
        variant="outline"
        onClick={onGoogle}
        disabled={googleLoading || loading}
        className="w-full h-11 border-neutral-200 hover:border-[#AECFF6] hover:bg-[#EBF3FD] transition-all gap-2.5 text-neutral-700 font-medium"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        )}
        Lanjutkan dengan Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-neutral-100" />
        <span className="text-xs text-neutral-400 font-medium">atau</span>
        <div className="flex-1 h-px bg-neutral-100" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: E }}
          className="space-y-1.5"
        >
          <Label htmlFor="email" className="text-sm font-semibold text-neutral-700">Email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="nama@perusahaan.com"
              disabled={loading}
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
          transition={{ duration: 0.35, delay: 0.18, ease: E }}
          className="space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-neutral-700">Kata Sandi</Label>
            <Link href="/forgot-password" className="text-xs font-semibold text-[#106CD8] hover:text-[#0D59B4]">
              Lupa kata sandi?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={loading}
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
          transition={{ duration: 0.35, delay: 0.26, ease: E }}
        >
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#106CD8] hover:bg-[#0D59B4] text-white rounded-xl font-semibold shadow-sm shadow-blue-200 gap-2 transition-all"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Masuk...</>
            ) : (
              <>Masuk ke Workspace <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </motion.div>
      </form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4, ease: E }}
        className="text-center text-sm text-neutral-500"
      >
        Belum punya akun?{' '}
        <Link href="/register" className="font-semibold text-[#106CD8] hover:text-[#0D59B4] transition-colors">
          Daftar gratis
        </Link>
      </motion.p>
    </motion.div>
  );
}
