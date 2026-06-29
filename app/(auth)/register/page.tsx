'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signUp } from '@/lib/supabase/actions';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, ArrowRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
const E    = [0.22, 1, 0.36, 1] as [number, number, number, number];

const schema = z.object({
  fullName:      z.string().min(2, 'Nama minimal 2 karakter'),
  email:         z.string().email('Masukkan alamat email yang valid'),
  workspaceName: z.string().min(2, 'Nama workspace minimal 2 karakter'),
  password:      z.string().min(6, 'Kata sandi minimal 6 karakter'),
});
type Values = z.infer<typeof schema>;

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
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', workspaceName: '', password: '' },
  });

  const pw = watch('password');

  const onSubmit = async (data: Values) => {
    setLoading(true);
    const fd = new FormData();
    fd.append('email', data.email);
    fd.append('password', data.password);
    fd.append('full_name', data.fullName);
    fd.append('workspace_name', data.workspaceName);
    try {
      const result = await signUp(fd);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        setSuccessMsg(result.success);
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <motion.div className="space-y-6 text-center" style={{ fontFamily: FONT }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: E }}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50">
          <Mail className="h-6 w-6 text-neutral-700" />
        </div>
        <div>
          <h1 className="text-xl font-800 text-neutral-900" style={{ fontWeight: 800 }}>Cek email Anda</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{successMsg}</p>
        </div>
        <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 text-left">
          <p className="text-xs text-neutral-500">Tidak menerima email? Periksa folder spam, atau hubungi kami di{' '}
            <a href="mailto:halo@ruangbaru.my.id" className="font-medium underline underline-offset-2" style={{ color: BLUE }}>
              halo@ruangbaru.my.id
            </a>
          </p>
        </div>
        <Link href="/login">
          <motion.button className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 shadow-sm"
            style={{ fontFamily: FONT }} whileHover={{ borderColor: '#9CA3AF' }} whileTap={{ scale: 0.97 }}>
            Kembali ke halaman masuk
          </motion.button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-6" style={{ fontFamily: FONT }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: E }}>

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-800 tracking-tight text-neutral-900" style={{ fontWeight: 800 }}>
          Buat workspace baru
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Gratis untuk tim hingga 5 anggota. Tidak perlu kartu kredit.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full name */}
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-neutral-700">Nama Lengkap</label>
          <input
            id="fullName"
            type="text"
            placeholder="Budi Santoso"
            disabled={loading}
            {...register('fullName')}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 disabled:opacity-60"
            style={{ fontFamily: FONT }}
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-neutral-700">Email</label>
          <input
            id="reg-email"
            type="email"
            placeholder="nama@perusahaan.com"
            disabled={loading}
            {...register('email')}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 disabled:opacity-60"
            style={{ fontFamily: FONT }}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        {/* Workspace name */}
        <div>
          <label htmlFor="workspaceName" className="mb-1.5 block text-sm font-medium text-neutral-700">Nama Workspace</label>
          <input
            id="workspaceName"
            type="text"
            placeholder="Contoh: Kreasi Studio"
            disabled={loading}
            {...register('workspaceName')}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 disabled:opacity-60"
            style={{ fontFamily: FONT }}
          />
          {errors.workspaceName && <p className="mt-1 text-xs text-red-500">{errors.workspaceName.message}</p>}
          <p className="mt-1 text-[11px] text-neutral-400">Ini akan menjadi nama workspace yang dilihat anggota tim Anda.</p>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-neutral-700">Kata Sandi</label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPw ? 'text' : 'password'}
              placeholder="Min. 6 karakter"
              disabled={loading}
              {...register('password')}
              className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-3.5 pr-10 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 disabled:opacity-60"
              style={{ fontFamily: FONT }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <StrengthBar password={pw} />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <motion.button
          type="submit"
          id="btn-submit-register"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: BLUE, fontFamily: FONT }}
          whileHover={{ opacity: 0.9 }} whileTap={{ scale: 0.98 }}>
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Membuat akun...</>
            : <>Buat Workspace <ArrowRight className="h-4 w-4" /></>}
        </motion.button>
      </form>

      {/* Terms note */}
      <p className="text-center text-xs text-neutral-400 leading-5">
        Dengan mendaftar, Anda menyetujui{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-600">ketentuan layanan</Link>
        {' '}dan{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-600">kebijakan privasi</Link>{' '}kami.
      </p>

      {/* Login link */}
      <p className="text-center text-sm text-neutral-500">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-semibold transition-colors hover:opacity-80" style={{ color: BLUE }}>
          Masuk di sini
        </Link>
      </p>
    </motion.div>
  );
}
