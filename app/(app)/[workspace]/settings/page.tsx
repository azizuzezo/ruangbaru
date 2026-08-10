'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Layers, Save, Loader2, Camera, SlidersHorizontal, LayoutGrid, ListTodo,
  Bell, Mail, ShieldAlert, LogOut, Trash2, Copy, Check, ArrowRightLeft, Pencil,
  Code2, Plus, KeyRound, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn, getInitials, slugify, formatRelativeTime } from '@/lib/utils';
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';
import { useCustomFields } from '@/lib/hooks/useCustomFields';
import { KanbanColumnsSettings } from '@/components/settings/KanbanColumnsSettings';
import { CustomFieldsSettings } from '@/components/settings/CustomFieldsSettings';
import { useT } from '@/lib/i18n/useT';
import type { WorkspaceMember, ApiKey } from '@/types';
import { generateApiKey } from '@/lib/apiKeys';

type Prefs = { default_view: 'kanban' | 'list'; email_notifications: boolean; push_notifications: boolean };
const DEFAULT_PREFS: Prefs = { default_view: 'kanban', email_notifications: true, push_notifications: true };

export default function SettingsPage() {
  const t = useT('settings');
  const tc = useT('common');
  const router = useRouter();
  const { currentWorkspace, currentUser, setCurrentWorkspace, setCurrentUser, workspaces, setWorkspaces } = useWorkspaceStore();
  const isOwner = !!currentWorkspace && !!currentUser && currentWorkspace.owner_id === currentUser.id;
  const { statuses, reload: reloadStatuses } = useTaskStatuses(currentWorkspace?.id);
  const { fields: customFields, reload: reloadFields } = useCustomFields(currentWorkspace?.id);
  const [isAdmin, setIsAdmin] = useState(false);

  // Full roster — used for the admin/owner check below and for picking a
  // transfer-ownership target further down.
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  // Workspace Settings State
  const [wsName, setWsName] = useState('');
  const [wsDescription, setWsDescription] = useState('');
  const [wsSlug, setWsSlug] = useState('');
  const [wsDefaultAssigneeId, setWsDefaultAssigneeId] = useState('');
  const [savingWs, setSavingWs] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);

  // Transfer ownership state
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  // Profile Settings State
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Preferences state
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [savingPref, setSavingPref] = useState<string | null>(null);

  // Danger zone
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const supabase = createClient();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('avatarMustBeImage'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('avatarMaxSize'));
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${currentUser.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id)
        .select()
        .single();
      if (error) throw error;

      setCurrentUser(data);
      toast.success(t('avatarUpdated'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name);
      setWsDescription(currentWorkspace.description || '');
      setWsSlug(currentWorkspace.slug);
      setWsDefaultAssigneeId(currentWorkspace.default_assignee_id || '');
    }
    if (currentUser) {
      setProfileName(currentUser.full_name || '');
      setProfileBio(currentUser.bio || '');
    }
  }, [currentWorkspace, currentUser]);

  // Full roster — used below for the admin check and the ownership-transfer
  // target picker. Kanban columns / custom fields, the workspace edit form,
  // and team management are all admin-only — owner always qualifies,
  // otherwise this member's workspace role decides.
  useEffect(() => {
    if (!currentWorkspace) return;
    supabase
      .from('workspace_members')
      .select('*, profile:profiles(*)')
      .eq('workspace_id', currentWorkspace.id)
      .then(({ data }: { data: WorkspaceMember[] | null }) => setMembers(data || []));
  }, [currentWorkspace]);

  useEffect(() => {
    if (isOwner) { setIsAdmin(true); return; }
    const myRole = members.find((m) => m.user_id === currentUser?.id)?.role;
    setIsAdmin(myRole === 'admin' || myRole === 'owner');
  }, [members, currentUser, isOwner]);

  // API keys — RLS already scopes this to admins, but only fetch once we
  // know we are one, so a member never even issues the (empty) request.
  useEffect(() => {
    if (!currentWorkspace || !isAdmin) return;
    supabase
      .from('api_keys')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: ApiKey[] | null }) => setApiKeys(data || []));
  }, [currentWorkspace, isAdmin]);

  // Load saved preferences (falls back to the defaults above if the user
  // has never changed anything — no row exists yet in that case).
  useEffect(() => {
    if (!currentUser) return;
    supabase
      .from('user_preferences')
      .select('default_view, email_notifications, push_notifications')
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }: { data: Partial<Prefs> | null }) => {
        if (data) setPrefs((p) => ({ ...p, ...data }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const savePref = async (patch: Partial<Prefs>, label: string) => {
    if (!currentUser) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSavingPref(label);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: currentUser.id, ...next }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setSavingPref(null);
    }
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !wsName.trim() || !currentWorkspace) return;
    const nextSlug = slugify(wsSlug.trim()) || currentWorkspace.slug;
    setSavingWs(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({
          name: wsName,
          description: wsDescription || null,
          slug: nextSlug,
          default_assignee_id: wsDefaultAssigneeId || null,
        })
        .eq('id', currentWorkspace.id)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error(t('workspaceSlugTaken'));
        throw error;
      }
      toast.success(t('workspaceSaveSuccess'));
      setCurrentWorkspace(data);
      setWorkspaces(workspaces.map((w) => (w.id === currentWorkspace.id ? data : w)));
      setWsSlug(data.slug);
      // The URL segment IS the slug — follow a rename so the page keeps working.
      if (data.slug !== currentWorkspace.slug) {
        router.replace(`/${data.slug}/settings`);
      }
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setSavingWs(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!isOwner || !currentWorkspace || !transferTargetId) return;
    setTransferring(true);
    try {
      const { error } = await supabase.rpc('transfer_workspace_ownership', {
        ws_id: currentWorkspace.id,
        new_owner_id: transferTargetId,
      });
      if (error) throw error;
      const updated = { ...currentWorkspace, owner_id: transferTargetId };
      setCurrentWorkspace(updated);
      setWorkspaces(workspaces.map((w) => (w.id === currentWorkspace.id ? updated : w)));
      toast.success(t('transferOwnershipSuccess'));
      setTransferOpen(false);
      setTransferTargetId('');
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setTransferring(false);
    }
  };

  // Generate a new API key. The plaintext key only ever exists here in
  // browser memory + the one-time reveal dialog — only its hash is stored.
  const handleGenerateKey = async () => {
    if (!currentWorkspace || !currentUser || !newKeyName.trim()) return;
    setGeneratingKey(true);
    try {
      const { key, hash, prefix } = await generateApiKey();
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          workspace_id: currentWorkspace.id,
          name: newKeyName.trim(),
          key_hash: hash,
          key_prefix: prefix,
          created_by: currentUser.id,
        })
        .select()
        .single();
      if (error) throw error;

      setApiKeys((prev) => [data as ApiKey, ...prev]);
      setCreateKeyOpen(false);
      setNewKeyName('');
      setRevealedKey(key);
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    setRevokingKeyId(id);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setApiKeys((prev) => prev.map((k) => (k.id === id ? (data as ApiKey) : k)));
      toast.success(t('apiKeyRevokedToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setRevokingKeyId(null);
    }
  };

  const copyRevealedKey = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      toast.success(t('apiKeyCopiedToast'));
    } catch {
      // Clipboard permission denied — the key is still selectable/visible in the dialog.
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !currentUser) return;
    setSavingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: profileName, bio: profileBio })
        .eq('id', currentUser.id)
        .select()
        .single();
      if (error) throw error;
      toast.success(t('profileUpdateSuccess'));
      setCurrentUser(data);
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setSavingProfile(false);
    }
  };

  const copySlug = () => {
    if (!currentWorkspace) return;
    navigator.clipboard.writeText(`${window.location.origin}/${currentWorkspace.slug}`);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 1500);
  };

  const handleDangerConfirm = async () => {
    if (!currentWorkspace || !currentUser) return;
    setConfirmBusy(true);
    try {
      if (isOwner) {
        const { error } = await supabase.from('workspaces').delete().eq('id', currentWorkspace.id);
        if (error) throw error;
        toast.success(t('workspaceDeletedSuccess'));
      } else {
        const { error } = await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', currentWorkspace.id)
          .eq('user_id', currentUser.id);
        if (error) throw error;
        toast.success(t('workspaceLeftSuccess'));
      }
      const remaining = workspaces.filter((w) => w.id !== currentWorkspace.id);
      setWorkspaces(remaining);
      setCurrentWorkspace(remaining[0] || null);
      setConfirmOpen(false);
      router.replace(remaining[0] ? `/${remaining[0].slug}/dashboard` : '/welcome');
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight sm:text-3xl">
          {t('settingsPageTitle')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t('settingsPageSubtitle')}
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Workspace settings card */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> {t('workspaceCardTitle')}
            </CardTitle>
            <CardDescription className="text-[11px]">{t('workspaceCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {!isAdmin && (
              <p className="mb-4 text-[11px] text-muted-foreground">{t('workspaceReadOnlyNotice')}</p>
            )}
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t('workspaceNameLabel')}</label>
                <Input
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder={t('workspaceNamePlaceholder')}
                  disabled={savingWs || !isAdmin}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  {t('workspaceDescriptionLabel')} <span className="font-normal text-muted-foreground/60">{t('workspaceDescriptionOptional')}</span>
                </label>
                <textarea
                  value={wsDescription}
                  onChange={(e) => setWsDescription(e.target.value)}
                  placeholder={t('workspaceDescriptionPlaceholder')}
                  disabled={savingWs || !isAdmin}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20 disabled:opacity-70"
                />
              </div>
              {currentWorkspace && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">{t('workspaceLinkLabel')}</label>
                  {isAdmin ? (
                    <>
                      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2">
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/
                        </span>
                        <input
                          value={wsSlug}
                          onChange={(e) => setWsSlug(slugify(e.target.value))}
                          disabled={savingWs}
                          className="flex-1 min-w-0 bg-transparent text-xs text-foreground outline-none"
                        />
                        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t('workspaceLinkEditHint')}</p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                      <span className="flex-1 truncate text-xs text-muted-foreground">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/{currentWorkspace.slug}
                      </span>
                      <button type="button" onClick={copySlug} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                        {slugCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">{t('defaultAssigneeLabel')}</label>
                  <select
                    value={wsDefaultAssigneeId}
                    onChange={(e) => setWsDefaultAssigneeId(e.target.value)}
                    disabled={savingWs}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">{t('defaultAssigneeNone')}</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.email}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">{t('defaultAssigneeHint')}</p>
                </div>
              )}
              {isAdmin && (
                <Button type="submit" disabled={savingWs || !wsName.trim()} className="gap-1.5 h-9 text-xs">
                  {savingWs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{t('saveChangesButton')}</span>
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* 2. Personal profile settings card */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> {t('profileCardTitle')}
            </CardTitle>
            <CardDescription className="text-[11px]">{t('profileCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border/60">
              <div className="relative shrink-0">
                {currentUser?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.full_name || ''}
                    className="h-16 w-16 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {getInitials(currentUser?.full_name)}
                  </div>
                )}
                <label
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                  title={t('changePhotoTitle')}
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  <input type="file" accept="image/*" className="sr-only" disabled={uploadingAvatar} onChange={handleAvatarUpload} />
                </label>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{currentUser?.full_name || t('defaultUserName')}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t('avatarSizeHint')}</p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t('fullNameLabel')}</label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  disabled={savingProfile}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">{t('bioLabel')}</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder={t('bioPlaceholder')}
                  disabled={savingProfile}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                />
              </div>
              <Button type="submit" disabled={savingProfile || !profileName.trim()} className="gap-1.5 h-9 text-xs">
                {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>{t('updateProfileButton')}</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 3. Preferences card */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> {t('preferencesCardTitle')}
            </CardTitle>
            <CardDescription className="text-[11px]">{t('preferencesCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">{t('defaultTaskViewLabel')}</label>
              <div className="mt-2 inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => savePref({ default_view: 'kanban' }, 'view')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    prefs.default_view === 'kanban' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> {t('kanbanBoardOption')}
                </button>
                <button
                  type="button"
                  onClick={() => savePref({ default_view: 'list' }, 'view')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    prefs.default_view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <ListTodo className="h-3.5 w-3.5" /> {t('listOption')}
                </button>
                {savingPref === 'view' && <Loader2 className="h-3 w-3 ml-2 animate-spin text-muted-foreground" />}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t('defaultViewHint')}</p>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('emailNotificationsTitle')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('emailNotificationsDescription')}</p>
                </div>
              </div>
              <Switch checked={prefs.email_notifications} onCheckedChange={(v) => savePref({ email_notifications: v }, 'email')} disabled={savingPref === 'email'} />
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-start gap-2.5">
                <Bell className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('pushNotificationsTitle')}</p>
                  <p className="text-[11px] text-muted-foreground">{t('pushNotificationsDescription')}</p>
                </div>
              </div>
              <Switch checked={prefs.push_notifications} onCheckedChange={(v) => savePref({ push_notifications: v }, 'push')} disabled={savingPref === 'push'} />
            </div>
          </CardContent>
        </Card>

        {/* 4. Kanban columns + custom fields — admin/owner only (also RLS-enforced) */}
        {currentWorkspace && isAdmin && (
          <>
            <KanbanColumnsSettings workspaceId={currentWorkspace.id} statuses={statuses} onChanged={reloadStatuses} />
            <CustomFieldsSettings workspaceId={currentWorkspace.id} fields={customFields} onChanged={reloadFields} />
          </>
        )}

        {/* 5. API keys — admin/owner only. Lets this workspace connect
            external tools (Zapier-style automations, custom scripts) to
            the REST API. */}
        {currentWorkspace && isAdmin && (
          <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> {t('apiKeysCardTitle')}
              </CardTitle>
              <CardDescription className="text-[11px]">{t('apiKeysCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <a
                href="/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Code2 className="h-3.5 w-3.5" /> {t('apiKeysViewDocsLink')} <ExternalLink className="h-3 w-3" />
              </a>

              {apiKeys.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('apiKeysEmptyState')}</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-semibold text-foreground">{k.name}</p>
                          {k.revoked_at && (
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                              {t('apiKeyRevokedBadge')}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{k.key_prefix}••••••••</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {k.last_used_at
                            ? `${t('apiKeyLastUsedPrefix')} ${formatRelativeTime(k.last_used_at)}`
                            : t('apiKeyNeverUsed')}
                        </p>
                      </div>
                      {!k.revoked_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 gap-1 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={revokingKeyId === k.id}
                          onClick={() => handleRevokeKey(k.id)}
                        >
                          {revokingKeyId === k.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          {t('apiKeyRevokeButton')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button size="sm" variant="outline-brand" className="gap-1.5" onClick={() => setCreateKeyOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> {t('apiKeyGenerateButton')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 6. Transfer ownership — owner only. Kept separate from Danger Zone
            since it isn't destructive, just a handoff. */}
        {currentWorkspace && isOwner && (
          <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" /> {t('transferOwnershipCardTitle')}
              </CardTitle>
              <CardDescription className="text-[11px]">{t('transferOwnershipCardDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {members.filter((m) => m.user_id !== currentUser?.id).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('transferOwnershipNoMembers')}</p>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTransferOpen(true)}>
                  <ArrowRightLeft className="h-3.5 w-3.5" /> {t('transferOwnershipButton')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* 7. Danger zone */}
        {currentWorkspace && (
          <Card className="border border-destructive/30 bg-destructive/[0.03]">
            <CardHeader className="pb-3 border-b border-destructive/20">
              <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> {t('dangerZoneTitle')}
              </CardTitle>
              <CardDescription className="text-[11px]">{t('dangerZoneDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isOwner ? t('deleteWorkspaceTitle') : t('leaveWorkspaceTitle')}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isOwner ? t('deleteWorkspaceDescription') : t('leaveWorkspaceDescription')}
                  </p>
                </div>
                <Button variant="destructive" size="sm" className="gap-1.5 shrink-0" onClick={() => setConfirmOpen(true)}>
                  {isOwner ? <Trash2 className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
                  {isOwner ? t('deleteButton') : t('leaveButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !confirmBusy && setConfirmOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              {isOwner ? t('deleteWorkspaceConfirmTitle') : t('leaveWorkspaceConfirmTitle')}
            </DialogTitle>
            <DialogDescription>
              {isOwner
                ? t('deleteWorkspaceConfirmDescription').replace('{name}', currentWorkspace?.name || '')
                : t('leaveWorkspaceConfirmDescription').replace('{name}', currentWorkspace?.name || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" disabled={confirmBusy} onClick={() => setConfirmOpen(false)}>
              {t('cancelButton')}
            </Button>
            <Button variant="destructive" className="flex-1 gap-1.5" disabled={confirmBusy} onClick={handleDangerConfirm}>
              {confirmBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isOwner ? t('deletePermanentlyButton') : t('confirmLeaveButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={(o) => !transferring && setTransferOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              {t('transferOwnershipDialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('transferOwnershipDialogDescription')}</DialogDescription>
          </DialogHeader>
          <select
            value={transferTargetId}
            onChange={(e) => setTransferTargetId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('transferOwnershipSelectPlaceholder')}</option>
            {members
              .filter((m) => m.user_id !== currentUser?.id)
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email}
                </option>
              ))}
          </select>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" disabled={transferring} onClick={() => setTransferOpen(false)}>
              {t('cancelButton')}
            </Button>
            <Button className="flex-1 gap-1.5" disabled={transferring || !transferTargetId} onClick={handleTransferOwnership}>
              {transferring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
              {t('confirmTransferButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createKeyOpen} onOpenChange={(o) => !generatingKey && setCreateKeyOpen(o)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> {t('apiKeyGenerateDialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('apiKeyGenerateDialogDescription')}</DialogDescription>
          </DialogHeader>
          <Input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder={t('apiKeyNamePlaceholder')}
            disabled={generatingKey}
            autoFocus
          />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" disabled={generatingKey} onClick={() => setCreateKeyOpen(false)}>
              {t('cancelButton')}
            </Button>
            <Button className="flex-1 gap-1.5" disabled={generatingKey || !newKeyName.trim()} onClick={handleGenerateKey}>
              {generatingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t('apiKeyGenerateButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revealedKey} onOpenChange={(o) => !o && setRevealedKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> {t('apiKeyRevealDialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('apiKeyRevealDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-2.5">
            <code className="flex-1 select-all break-all font-mono text-xs text-foreground">{revealedKey}</code>
            <button
              type="button"
              onClick={copyRevealedKey}
              title={t('apiKeyCopyTooltip')}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-destructive">{t('apiKeyRevealWarning')}</p>
          <Button className="w-full" onClick={() => setRevealedKey(null)}>
            {t('apiKeyRevealDoneButton')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
