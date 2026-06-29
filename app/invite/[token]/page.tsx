'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, LogIn } from 'lucide-react';

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
        setState({ kind: 'error', message: translateError(error.message) });
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm animate-fade-in-up">
        <Image src="/logo.png" alt="RuangBaru" width={48} height={48} className="rounded-xl mx-auto" />

        {(state.kind === 'loading' || state.kind === 'accepting') && (
          <div className="space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Memproses undangan Anda…</p>
          </div>
        )}

        {state.kind === 'needs-auth' && (
          <div className="space-y-4">
            <h1 className="font-display text-lg font-bold text-foreground">Anda diundang ke RuangBaru</h1>
            <p className="text-sm text-muted-foreground">
              Masuk atau daftar dengan email yang menerima undangan untuk bergabung.
            </p>
            <Link href={`/login?redirectTo=/invite/${token}`}>
              <Button className="w-full gap-2"><LogIn className="h-4 w-4" /> Masuk untuk Bergabung</Button>
            </Link>
            <Link href={`/register?redirectTo=/invite/${token}`} className="block text-xs text-primary hover:underline">
              Belum punya akun? Daftar gratis
            </Link>
          </div>
        )}

        {state.kind === 'done' && (
          <div className="space-y-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <h1 className="font-display text-lg font-bold text-foreground">Berhasil bergabung!</h1>
            <p className="text-sm text-muted-foreground">Mengarahkan ke ruang kerja…</p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="space-y-4">
            <XCircle className="h-8 w-8 text-destructive mx-auto" />
            <h1 className="font-display text-lg font-bold text-foreground">Undangan tidak valid</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Ke Dashboard</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function translateError(message: string): string {
  if (message.includes('expired')) return 'Undangan ini sudah kedaluwarsa. Minta undangan baru dari tim Anda.';
  if (message.includes('already accepted')) return 'Undangan ini sudah pernah digunakan.';
  if (message.includes('different email')) return 'Undangan ini dikirim ke alamat email yang berbeda.';
  if (message.includes('not found')) return 'Undangan tidak ditemukan.';
  return message;
}
