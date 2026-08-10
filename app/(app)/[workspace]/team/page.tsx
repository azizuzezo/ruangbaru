'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect } from 'react';
import {
  Users, Mail, Plus, ShieldCheck, Trash2,
  Sparkles, Loader2, Award, UserCheck, Link2, Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { WorkspaceMember, WorkspaceInvitation } from '@/types';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useT } from '@/lib/i18n/useT';

export default function TeamPage() {
  const t = useT('team');
  const tc = useT('common');
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  // Derived from the already-fetched roster — no extra round trip. Mirrors
  // is_workspace_admin() server-side: 'owner' and 'admin' both qualify.
  const myRole = members.find((m) => m.user_id === currentUser?.id)?.role;
  const isAdmin = myRole === 'admin' || myRole === 'owner';

  // Invite form state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);

  // Per-row busy states — id of the member/invite currently being acted on.
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const supabase = createClient();

  // Load team data
  const loadTeamData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);

      // 1. Fetch active members
      const { data: membersData } = await supabase
        .from('workspace_members')
        .select('*, profile:profiles(*)')
        .eq('workspace_id', currentWorkspace.id);

      setMembers((membersData as WorkspaceMember[]) || []);

      // 2. Fetch pending invitations
      const { data: invitesData } = await supabase
        .from('workspace_invitations')
        .select('*, inviter:profiles(*)')
        .eq('workspace_id', currentWorkspace.id)
        .is('accepted_at', null);

      setInvitations((invitesData as WorkspaceInvitation[]) || []);
    } catch (err) {
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [currentWorkspace]);

  // Invite member handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !email.trim() || !currentWorkspace || !currentUser) return;
    setInviting(true);

    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: currentWorkspace.id,
          email,
          role,
          invited_by: currentUser.id,
        })
        .select('*, inviter:profiles(*)')
        .single();

      if (error) throw error;

      const created = data as WorkspaceInvitation;
      setInvitations((prev) => [created, ...prev]);

      // Send the invitation email via Resend (best-effort; link is the fallback).
      fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName: currentWorkspace.name,
          inviterName: currentUser.full_name || currentUser.email,
          invitations: [{ email: created.email, token: created.token }],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res?.sent) {
            toast.success(t('teamInviteEmailSent').replace('{email}', email));
          } else {
            const reason = res?.errors?.[0];
            if (reason) toast.warning(t('teamEmailFailed').replace('{reason}', reason), { duration: 8000 });
            copyInviteLink(created.token, email);
          }
        })
        .catch(() => copyInviteLink(created.token, email));

      setInviteOpen(false);
      setEmail('');
      setRole('member');
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setInviting(false);
    }
  };

  // Change member role handler
  const handleChangeRole = async (memberId: string, userId: string, newRole: 'admin' | 'member' | 'viewer') => {
    if (!isAdmin) return;
    if (userId === currentUser?.id) {
      toast.error(t('teamChangeRoleSelfError'));
      return;
    }
    setRoleChangingId(memberId);
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);
      if (error) throw error;
      toast.success(t('teamRoleUpdateSuccess'));
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setRoleChangingId(null);
    }
  };

  // Remove member handler
  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUser?.id) {
      toast.error(t('teamRemoveSelfError'));
      return;
    }

    setRemovingId(memberId);
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success(t('teamRemoveMemberSuccess'));
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setRemovingId(null);
    }
  };

  // Copy a shareable invite link to the clipboard.
  const copyInviteLink = async (token: string, forEmail?: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(
        forEmail ? t('teamInviteLinkCreatedForEmail').replace('{email}', forEmail) : t('teamInviteLinkCopied'),
        { description: link }
      );
    } catch {
      toast.info(t('teamInviteLinkToastTitle'), { description: link });
    }
  };

  // Cancel invitation handler
  const handleCancelInvite = async (inviteId: string) => {
    if (!isAdmin) return;
    setCancelingId(inviteId);
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast.success(t('teamInviteCancelSuccess'));
      setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setCancelingId(null);
    }
  };

  if (loading) return <TeamSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight sm:text-3xl">
            {t('teamPageTitle')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('teamPageSubtitle')}
          </p>
        </div>

        {isAdmin && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> {t('teamInviteButton')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                {t('teamInviteDialogTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('teamInviteDialogDescription')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Input
                  type="email"
                  placeholder={t('teamEmailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={inviting}
                  required
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t('teamRoleLabel')}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="admin">{t('teamRoleAdminOption')}</option>
                  <option value="member">{t('teamRoleMemberOption')}</option>
                  <option value="viewer">{t('teamRoleViewerOption')}</option>
                </select>
              </div>

              <Button type="submit" className="w-full h-10 mt-2" disabled={inviting || !email.trim()}>
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('teamInviteSending')}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('teamInviteSendButton')}
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Active members list */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-border/80">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground">{t('teamActiveMembersTitle')}</CardTitle>
              <CardDescription className="text-[11px]">{t('teamActiveMembersDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {getInitials(m.profile?.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{m.profile?.full_name || t('teamMemberFallbackName')}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.profile?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Only an admin/owner can reassign roles or remove someone
                          — and never the owner's own row (that's a transfer,
                          handled separately in Settings, not a role edit). */}
                      {!isAdmin || m.user_id === currentUser?.id || m.role === 'owner' ? (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold capitalize flex items-center gap-1">
                          <Award className="h-3 w-3" /> {m.role}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.id, m.user_id, e.target.value as 'admin' | 'member' | 'viewer')}
                            disabled={roleChangingId === m.id}
                            className="text-[10px] bg-primary/5 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold capitalize focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          {roleChangingId === m.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        </div>
                      )}
                      {isAdmin && m.user_id !== currentUser?.id && m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.user_id)}
                          disabled={removingId === m.id}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors text-muted-foreground disabled:opacity-50"
                          title={t('teamRemoveMemberTooltip')}
                        >
                          {removingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Pending invitations list */}
        <div className="space-y-4">
          <Card className="border border-border/80">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground">{t('teamPendingInvitationsTitle')}</CardTitle>
              <CardDescription className="text-[11px]">{t('teamPendingInvitationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted/40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : invitations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {t('teamNoPendingInvitations')}
                </div>
              ) : (
                invitations.map((i) => (
                  <div key={i.id} className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{i.email}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{t('teamInvitationRolePrefix')}<span className="capitalize">{i.role}</span></p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyInviteLink(i.token)}
                        className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors"
                        title={t('teamCopyInviteLinkTooltip')}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleCancelInvite(i.id)}
                          disabled={cancelingId === i.id}
                          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground transition-colors disabled:opacity-50"
                          title={t('teamCancelInviteTooltip')}
                        >
                          {cancelingId === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-5 w-32" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
