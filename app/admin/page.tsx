'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ShieldCheck, RefreshCw, Search, Crown, Users, Building2, Sparkles,
  Trash2, ShieldAlert, Loader2, LayoutGrid, UserCog,
} from 'lucide-react';
import type { WorkspacePlan } from '@/types';
import { useT } from '@/lib/i18n/useT';

const ADMIN_EMAILS = ['aziz@duacincin.id', 'aziz@skor.co'];
const PLANS: WorkspacePlan[] = ['free', 'pro', 'business', 'enterprise'];

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

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  owned_workspaces: { id: string; name: string; slug: string }[];
  memberships: { count: number }[];
}

type DeleteTarget =
  | { type: 'workspace'; id: string; label: string; confirmText: string }
  | { type: 'user'; id: string; label: string; confirmText: string; ownedCount: number };

export default function AdminPage() {
  const t = useT('marketingPages');
  const tc = useT('common');
  const supabase = createClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<'workspaces' | 'users'>('workspaces');

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const PLAN_LABELS: Record<WorkspacePlan, string> = {
    free: t('adminPlanFree'),
    pro: t('adminPlanPro'),
    business: t('adminPlanBusiness'),
    enterprise: t('adminPlanEnterprise'),
  };

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string; email?: string } | null } }) => {
      setAuthorized(!!user && ADMIN_EMAILS.includes(user.email ?? ''));
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/workspaces');
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || t('adminErrorLoadDataFallback'));
      }
      const { workspaces: data } = await res.json();
      setWorkspaces(data || []);
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || t('adminErrorLoadDataFallback'));
      }
      const { users: data } = await res.json();
      setUsers(data || []);
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      fetchWorkspaces();
      fetchUsers();
    }
  }, [authorized, fetchWorkspaces, fetchUsers]);

  const updatePlan = async (workspaceId: string, plan: WorkspacePlan) => {
    setUpdating(workspaceId);
    try {
      const res = await fetch('/api/admin/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, plan }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || t('adminErrorUpdatePlanFallback'));
      setWorkspaces((prev) => prev.map((w) => w.id === workspaceId ? { ...w, plan } : w));
      toast.success(t('adminPlanUpdateSuccess').replace('{plan}', PLAN_LABELS[plan]));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setUpdating(null);
    }
  };

  const openDeleteWorkspace = (w: Workspace) => {
    setDeleteInput('');
    setDeleteTarget({ type: 'workspace', id: w.id, label: w.name, confirmText: w.slug });
  };

  const openDeleteUser = (u: AdminUser) => {
    setDeleteInput('');
    setDeleteTarget({
      type: 'user',
      id: u.id,
      label: u.full_name || u.email,
      confirmText: u.email,
      ownedCount: u.owned_workspaces?.length || 0,
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteInput !== deleteTarget.confirmText) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'workspace') {
        const res = await fetch('/api/admin/delete-workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: deleteTarget.id }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || t('adminDeleteWorkspaceError'));
        setWorkspaces((prev) => prev.filter((w) => w.id !== deleteTarget.id));
        toast.success(t('adminDeleteWorkspaceSuccess').replace('{name}', deleteTarget.label));
      } else {
        const res = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: deleteTarget.id }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || t('adminDeleteUserError'));
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        toast.success(t('adminDeleteUserSuccess').replace('{name}', deleteTarget.label));
        // Any workspaces owned by this user were cascade-deleted server-side.
        fetchWorkspaces();
      }
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setDeleting(false);
    }
  };

  // Authorization loading
  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">{t('adminCheckingAccess')}</div>
      </div>
    );
  }

  // Not authorized
  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <ShieldCheck className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold text-foreground">{t('adminAccessDeniedTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t('adminAccessDeniedBody')}
        </p>
        <a href="/">
          <Button variant="outline" size="sm">{t('adminBackHome')}</Button>
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

  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
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
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('adminTitle')}</h1>
              <p className="text-xs text-muted-foreground">{t('adminSubtitle')}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => (tab === 'workspaces' ? fetchWorkspaces() : fetchUsers())}
            disabled={tab === 'workspaces' ? loading : usersLoading}
          >
            <RefreshCw className={`h-4 w-4 ${(tab === 'workspaces' ? loading : usersLoading) ? 'animate-spin' : ''}`} /> {t('adminRefreshButton')}
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('adminStatTotal'), value: stats.total, icon: Building2, color: 'text-foreground' },
            { label: t('adminStatEnterprise'), value: stats.enterprise, icon: Crown, color: 'text-amber-600' },
            { label: t('adminStatBusiness'), value: stats.business, icon: Sparkles, color: 'text-violet-600' },
            { label: t('adminStatPro'), value: stats.pro, icon: Users, color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 space-y-1">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-semibold ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
          <button
            onClick={() => setTab('workspaces')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'workspaces' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> {t('adminTabWorkspaces')}
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === 'users' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCog className="h-3.5 w-3.5" /> {t('adminTabUsers')}
          </button>
        </div>

        {tab === 'workspaces' ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('adminSearchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Workspace table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>{t('adminTableHeaderWorkspace')}</span>
                <span className="hidden sm:block">{t('adminTableHeaderOwner')}</span>
                <span>{t('adminTableHeaderMembers')}</span>
                <span>{t('adminTableHeaderPlan')}</span>
                <span />
              </div>

              {loading ? (
                <div className="divide-y divide-border">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3.5">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="hidden sm:block h-3 w-36" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-7 w-32 rounded-lg" />
                      <Skeleton className="h-7 w-7 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {search ? t('adminEmptyFiltered') : t('adminEmptyNone')}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((w) => (
                    <div key={w.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">
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
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t('adminSavingLabel')}
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
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => openDeleteWorkspace(w)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* User search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('adminUserSearchPlaceholder')}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Users table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <span>{t('adminUserTableHeaderUser')}</span>
                <span className="hidden sm:block">{t('adminUserTableHeaderOwned')}</span>
                <span>{t('adminUserTableHeaderMemberships')}</span>
                <span />
              </div>

              {usersLoading ? (
                <div className="divide-y divide-border">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3.5">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-40" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="hidden sm:block h-3 w-24" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-7 w-7 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {userSearch ? t('adminEmptyUsersFiltered') : t('adminEmptyUsersNone')}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.full_name || '—'}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="hidden sm:flex min-w-0 max-w-[220px] flex-wrap gap-1">
                        {u.owned_workspaces?.length
                          ? u.owned_workspaces.map((w) => (
                              <Badge key={w.id} variant="outline" className="text-[10px] font-medium">{w.name}</Badge>
                            ))
                          : <span className="text-[11px] text-muted-foreground">{t('adminUserOwnedWorkspacesNone')}</span>}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {u.memberships?.[0]?.count ?? 0}
                      </span>
                      {ADMIN_EMAILS.includes(u.email) || u.id === currentUserId ? (
                        <span className="text-[11px] text-muted-foreground">{t('adminSelfDeleteBlocked')}</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => openDeleteUser(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          {t('adminFooterNote')} {ADMIN_EMAILS.join(', ')}
        </p>
      </div>

      {/* Delete confirmation — requires typing the exact slug/email to arm the button */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !deleting && !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              {deleteTarget?.type === 'workspace' ? t('adminDeleteWorkspaceConfirmTitle') : t('adminDeleteUserConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <span className="block">
                {deleteTarget?.type === 'workspace'
                  ? t('adminDeleteWorkspaceConfirmDescription').replace('{name}', deleteTarget.label)
                  : t('adminDeleteUserConfirmDescription').replace('{name}', deleteTarget?.label || '')}
              </span>
              {deleteTarget?.type === 'user' && deleteTarget.ownedCount > 0 && (
                <span className="block font-semibold text-destructive">
                  {t('adminDeleteUserOwnedWarning').replace('{count}', String(deleteTarget.ownedCount))}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              {t('adminDeleteConfirmInputLabel').replace('{value}', deleteTarget?.confirmText || '')}
            </label>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={deleteTarget?.confirmText}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              {t('adminCancelButton')}
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              disabled={deleting || deleteInput !== deleteTarget?.confirmText}
              onClick={confirmDelete}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {t('adminDeletePermanentlyButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
