'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ShieldCheck, RefreshCw, Search, Crown, Users, Building2, Sparkles } from 'lucide-react';
import type { WorkspacePlan } from '@/types';

const ADMIN_EMAILS = ['aziz@duacincin.id', 'aziz@skor.co'];
const PLANS: WorkspacePlan[] = ['free', 'pro', 'business', 'enterprise'];

const PLAN_LABELS: Record<WorkspacePlan, string> = {
  free: 'Gratis',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

const PLAN_COLORS: Record<WorkspacePlan, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-blue-50 text-blue-700 border border-blue-200',
  business: 'bg-violet-50 text-violet-700 border border-violet-200',
  enterprise: 'bg-amber-50 text-amber-700 border border-amber-200',
};

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: WorkspacePlan;
  created_at: string;
  owner: { id: string; full_name: string | null; email: string } | null;
  member_count: { count: number }[];
}

export default function AdminPage() {
  const supabase = createClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { email?: string } | null } }) => {
      setAuthorized(!!user && ADMIN_EMAILS.includes(user.email ?? ''));
    });
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workspaces');
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Gagal memuat data');
      }
      const { workspaces: data } = await res.json();
      setWorkspaces(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Error memuat workspace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) fetchWorkspaces();
  }, [authorized, fetchWorkspaces]);

  const updatePlan = async (workspaceId: string, plan: WorkspacePlan) => {
    setUpdating(workspaceId);
    try {
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, plan }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Gagal update plan');
      setWorkspaces((prev) => prev.map((w) => w.id === workspaceId ? { ...w, plan } : w));
      toast.success(`Plan workspace berhasil diubah ke ${PLAN_LABELS[plan]}`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah plan');
    } finally {
      setUpdating(null);
    }
  };

  // Authorization loading
  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Memeriksa akses...</div>
      </div>
    );
  }

  // Not authorized
  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">Akses Ditolak</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Halaman ini hanya dapat diakses oleh administrator RuangBaru.
        </p>
        <a href="/">
          <Button variant="outline" size="sm">Kembali ke Beranda</Button>
        </a>
      </div>
    );
  }

  const filtered = workspaces.filter(
    (w) =>
      !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.slug.toLowerCase().includes(search.toLowerCase()) ||
      (w.owner?.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: workspaces.length,
    enterprise: workspaces.filter((w) => w.plan === 'enterprise').length,
    pro: workspaces.filter((w) => w.plan === 'pro').length,
    business: workspaces.filter((w) => w.plan === 'business').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Panel Admin</h1>
              <p className="text-xs text-muted-foreground">Kelola workspace, plan, dan pengguna RuangBaru</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchWorkspaces} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Workspace', value: stats.total, icon: Building2, color: 'text-foreground' },
            { label: 'Enterprise', value: stats.enterprise, icon: Crown, color: 'text-amber-600' },
            { label: 'Business', value: stats.business, icon: Sparkles, color: 'text-violet-600' },
            { label: 'Pro', value: stats.pro, icon: Users, color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-extrabold ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari workspace, slug, atau email owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Workspace table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Workspace</span>
            <span className="hidden sm:block">Owner</span>
            <span>Anggota</span>
            <span>Plan</span>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3.5">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="hidden sm:block h-3 w-36" />
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-7 w-32 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? 'Tidak ada workspace yang cocok.' : 'Belum ada workspace.'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((w) => (
                <div key={w.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{w.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">/{w.slug}</p>
                  </div>
                  <div className="hidden sm:block min-w-0 max-w-[180px]">
                    <p className="text-xs text-foreground truncate">{w.owner?.full_name || '—'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{w.owner?.email || '—'}</p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {w.member_count?.[0]?.count ?? 0}
                  </span>
                  <div className="shrink-0">
                    {updating === w.id ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                      </div>
                    ) : (
                      <select
                        value={w.plan}
                        onChange={(e) => updatePlan(w.id, e.target.value as WorkspacePlan)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${PLAN_COLORS[w.plan]}`}
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Hanya dapat diakses oleh administrator · {ADMIN_EMAILS.join(', ')}
        </p>
      </div>
    </div>
  );
}
