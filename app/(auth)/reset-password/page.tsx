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

const schema = z.object({
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Kata sandi tidak cocok',
  path: ['confirm'],
});

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
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
        toast.error('Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.');
        router.replace('/forgot-password');
      }
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast.error(error.message || 'Gagal mengubah kata sandi. Coba lagi.');
      setLoading(false);
    } else {
      setDone(true);
      toast.success('Kata sandi berhasil diubah!');
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
          Kata Sandi Berhasil Diubah
        </h1>
        <p className="text-sm text-muted-foreground">
          Anda akan diarahkan ke halaman masuk dalam beberapa detik...
        </p>
        <Link href="/login">
          <Button className="w-full mt-4">Masuk Sekarang</Button>
        </Link>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memverifikasi tautan reset...</p>
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
          Buat Kata Sandi Baru
        </h1>
        <p className="text-sm text-muted-foreground">
          Masukkan kata sandi baru Anda. Gunakan minimal 8 karakter.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Kata Sandi Baru</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 karakter"
            disabled={loading}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Konfirmasi Kata Sandi</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="Ulangi kata sandi baru"
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
              Menyimpan...
            </>
          ) : (
            'Simpan Kata Sandi Baru'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ingat kata sandi lama?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Kembali Masuk
        </Link>
      </p>
    </div>
  );
}
