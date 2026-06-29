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

const forgotPasswordSchema = z.object({
  email: z.string().email('Masukkan alamat email yang valid'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
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
      setSuccessMsg('Jika email Anda terdaftar, tautan reset kata sandi sudah dikirim. Periksa inbox Anda.');
      toast.success('Tautan pemulihan dikirim!');
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.');
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
          Periksa Inbox Anda
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {successMsg}
        </p>
        <div className="pt-4">
          <Link href="/login">
            <Button className="w-full">Kembali ke Halaman Masuk</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Lupa Kata Sandi?
        </h1>
        <p className="text-sm text-muted-foreground">
          Masukkan alamat email terdaftar Anda dan kami akan mengirimkan tautan pemulihan.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="nama@perusahaan.com"
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
              Mengirim Tautan...
            </>
          ) : (
            'Kirim Tautan Pemulihan'
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Sudah ingat kata sandi Anda?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Masuk Kembali
        </Link>
      </p>
    </div>
  );
}
