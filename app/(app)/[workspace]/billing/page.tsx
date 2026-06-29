'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, ArrowUpRight, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { WorkspacePlan } from '@/types';

// Plan quotas. Higher tiers are effectively unlimited (represented as null).
const PLAN_LIMITS: Record<WorkspacePlan, { members: number | null; projects: number | null }> = {
  free: { members: 5, projects: 3 },
  pro: { members: 25, projects: null },
  business: { members: null, projects: null },
  enterprise: { members: null, projects: null },
};

export default function BillingPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const supabase = createClient();
  const [usage, setUsage] = useState({ members: 0, projects: 0 });
  const [loading, setLoading] = useState(true);

  const plan = (currentWorkspace?.plan || 'free') as WorkspacePlan;
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    if (!currentWorkspace) return;
    (async () => {
      setLoading(true);
      const [{ count: members }, { count: projects }] = await Promise.all([
        supabase.from('workspace_members').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('workspace_id', currentWorkspace.id).neq('status', 'archived'),
      ]);
      setUsage({ members: members || 0, projects: projects || 0 });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace]);

  const pct = (used: number, limit: number | null) => (limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100)));
  const label = (used: number, limit: number | null, unit: string) => (limit === null ? `${used} (Tak terbatas)` : `${used} / ${limit} ${unit}`);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
          Rencana Langganan & Tagihan
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Pantau penggunaan resource dan ubah paket langganan workspace tim Anda.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border border-border/85 bg-card/60 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-primary/10 rounded-full blur-2xl -z-10" />
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Paket Saat Ini:{' '}
              <span className="capitalize text-primary font-black">{plan}</span>
            </CardTitle>
            <CardDescription className="text-[11px]">Rincian pemakaian kuota ruang kerja Anda.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {loading ? (
              <div className="space-y-4">
                <div className="h-8 rounded bg-muted/40 animate-pulse" />
                <div className="h-8 rounded bg-muted/40 animate-pulse" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Anggota Tim</span>
                    <span className="text-muted-foreground">{label(usage.members, limits.members, 'Anggota')}</span>
                  </div>
                  <Progress value={pct(usage.members, limits.members)} className="h-2" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Proyek Aktif</span>
                    <span className="text-muted-foreground">{label(usage.projects, limits.projects, 'Proyek')}</span>
                  </div>
                  <Progress value={pct(usage.projects, limits.projects)} className="h-2" />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-[10px] text-muted-foreground leading-relaxed max-w-md">
                {plan === 'free'
                  ? 'Workspace Anda terdaftar dalam paket gratis. Dapatkan anggota & proyek lebih banyak serta kapasitas berkas lebih besar dengan beralih ke Professional.'
                  : 'Terima kasih telah menjadi pelanggan berbayar RuangBaru. Hubungi kami untuk perubahan paket.'}
              </div>
              <Button
                size="sm"
                variant="gradient"
                className="gap-1 text-xs whitespace-nowrap shrink-0"
                onClick={() =>
                  toast.info('Integrasi pembayaran segera hadir', {
                    description: 'Hubungi tim kami di sales@ruangbaru.id untuk meningkatkan paket lebih awal.',
                  })
                }
              >
                Tingkatkan Paket <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground">Paket Paling Sesuai Untuk Anda</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-border rounded-xl p-5 space-y-4 bg-background/50">
                <h3 className="font-display font-bold text-sm text-foreground">Paket Professional</h3>
                <p className="text-xs text-muted-foreground">Rp99.000 / user / bulan</p>
                <ul className="space-y-2 pt-2 border-t border-border/50">
                  {['Workspace tak terbatas', 'Tugas tak terbatas', 'Penyimpanan berkas 20 GB', 'Undangan anggota/klien', 'Dukungan prioritas'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-border rounded-xl p-5 space-y-4 bg-background/50">
                <h3 className="font-display font-bold text-sm text-foreground">Paket Business</h3>
                <p className="text-xs text-muted-foreground">Rp199.000 / user / bulan</p>
                <ul className="space-y-2 pt-2 border-t border-border/50">
                  {['Semua fitur Professional', 'Dedicated Account Manager', 'Keamanan SSO / SAML', 'Uptime SLA 99.9%', 'Prioritas bantuan teknis'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
