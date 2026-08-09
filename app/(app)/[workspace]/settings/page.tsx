'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Layers, Save, Loader2, Camera, SlidersHorizontal, LayoutGrid, ListTodo,
  Bell, Mail, ShieldAlert, LogOut, Trash2, Copy, Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';
import { useCustomFields } from '@/lib/hooks/useCustomFields';
import { KanbanColumnsSettings } from '@/components/settings/KanbanColumnsSettings';
import { CustomFieldsSettings } from '@/components/settings/CustomFieldsSettings';

type Prefs = { default_view: 'kanban' | 'list'; email_notifications: boolean; push_notifications: boolean };
const DEFAULT_PREFS: Prefs = { default_view: 'kanban', email_notifications: true, push_notifications: true };

export default function SettingsPage() {
  const router = useRouter();
  const { currentWorkspace, currentUser, setCurrentWorkspace, setCurrentUser, workspaces, setWorkspaces } = useWorkspaceStore();
  const isOwner = !!currentWorkspace && !!currentUser && currentWorkspace.owner_id === currentUser.id;
  const { statuses, reload: reloadStatuses } = useTaskStatuses(currentWorkspace?.id);
  const { fields: customFields, reload: reloadFields } = useCustomFields(currentWorkspace?.id);
  const [isAdmin, setIsAdmin] = useState(false);

  // Workspace Settings State
  const [wsName, setWsName] = useState('');
  const [wsDescription, setWsDescription] = useState('');
  const [savingWs, setSavingWs] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);

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
      toast.error('File harus berupa gambar');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 2 MB');
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
      toast.success('Foto profil diperbarui!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name);
      setWsDescription(currentWorkspace.description || '');
    }
    if (currentUser) {
      setProfileName(currentUser.full_name || '');
      setProfileBio(currentUser.bio || '');
    }
  }, [currentWorkspace, currentUser]);

  // Kanban columns / custom fields are admin-only — owner always qualifies,
  // otherwise check this member's workspace role.
  useEffect(() => {
    if (isOwner) { setIsAdmin(true); return; }
    if (!currentWorkspace || !currentUser) return;
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', currentWorkspace.id)
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }: { data: { role: string } | null }) => setIsAdmin(data?.role === 'admin'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, currentUser, isOwner]);

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
      toast.error(err.message || 'Gagal menyimpan preferensi');
    } finally {
      setSavingPref(null);
    }
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !currentWorkspace) return;
    setSavingWs(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ name: wsName, description: wsDescription || null })
        .eq('id', currentWorkspace.id)
        .select()
        .single();
      if (error) throw error;
      toast.success('Pengaturan workspace berhasil disimpan!');
      setCurrentWorkspace(data);
      setWorkspaces(workspaces.map((w) => (w.id === currentWorkspace.id ? data : w)));
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pengaturan workspace');
    } finally {
      setSavingWs(false);
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
      toast.success('Profil Anda berhasil diperbarui!');
      setCurrentUser(data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui profil');
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
        toast.success('Workspace berhasil dihapus.');
      } else {
        const { error } = await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', currentWorkspace.id)
          .eq('user_id', currentUser.id);
        if (error) throw error;
        toast.success('Anda telah keluar dari workspace.');
      }
      const remaining = workspaces.filter((w) => w.id !== currentWorkspace.id);
      setWorkspaces(remaining);
      setCurrentWorkspace(remaining[0] || null);
      setConfirmOpen(false);
      router.replace(remaining[0] ? `/${remaining[0].slug}/dashboard` : '/welcome');
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses permintaan');
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight sm:text-3xl">
          Pengaturan
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Kelola profil Anda, workspace, dan preferensi kerja tim.
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Workspace settings card */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Pengaturan Workspace
            </CardTitle>
            <CardDescription className="text-[11px]">Kelola identitas publik dan nama ruang kerja tim Anda.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nama Workspace</label>
                <Input
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="cth. Ruang Kerja Marketing"
                  disabled={savingWs}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Deskripsi <span className="font-normal text-muted-foreground/60">(opsional)</span>
                </label>
                <textarea
                  value={wsDescription}
                  onChange={(e) => setWsDescription(e.target.value)}
                  placeholder="Ceritakan singkat tentang tim atau workspace ini..."
                  disabled={savingWs}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                />
              </div>
              {currentWorkspace && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Tautan Workspace</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/{currentWorkspace.slug}
                    </span>
                    <button type="button" onClick={copySlug} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      {slugCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={savingWs || !wsName.trim()} className="gap-1.5 h-9 text-xs">
                {savingWs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Simpan Perubahan</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 2. Personal profile settings card */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Profil Pengguna
            </CardTitle>
            <CardDescription className="text-[11px]">Ubah detail informasi personal Anda di sistem ini.</CardDescription>
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
                  title="Ganti foto"
                >
                  {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  <input type="file" accept="image/*" className="sr-only" disabled={uploadingAvatar} onChange={handleAvatarUpload} />
                </label>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{currentUser?.full_name || 'Pengguna'}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG maks. 2 MB</p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Nama Lengkap</label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="cth. Budi Santoso"
                  disabled={savingProfile}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Bio Singkat</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Tulis deskripsi peran Anda..."
                  disabled={savingProfile}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                />
              </div>
              <Button type="submit" disabled={savingProfile || !profileName.trim()} className="gap-1.5 h-9 text-xs">
                {savingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Perbarui Profil</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 3. Preferences card */}
        <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" /> Preferensi
            </CardTitle>
            <CardDescription className="text-[11px]">Atur bagaimana RuangBaru bekerja untuk Anda.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase">Tampilan Tugas Default</label>
              <div className="mt-2 inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  onClick={() => savePref({ default_view: 'kanban' }, 'view')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    prefs.default_view === 'kanban' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Papan Kanban
                </button>
                <button
                  type="button"
                  onClick={() => savePref({ default_view: 'list' }, 'view')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    prefs.default_view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <ListTodo className="h-3.5 w-3.5" /> Daftar
                </button>
                {savingPref === 'view' && <Loader2 className="h-3 w-3 ml-2 animate-spin text-muted-foreground" />}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">Halaman Tugas akan terbuka dengan tampilan ini secara default.</p>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Notifikasi Email</p>
                  <p className="text-[11px] text-muted-foreground">Tugas baru, komentar, dan tenggat waktu lewat email.</p>
                </div>
              </div>
              <Switch checked={prefs.email_notifications} onCheckedChange={(v) => savePref({ email_notifications: v }, 'email')} disabled={savingPref === 'email'} />
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-4">
              <div className="flex items-start gap-2.5">
                <Bell className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Notifikasi Push</p>
                  <p className="text-[11px] text-muted-foreground">Pemberitahuan langsung di browser saat sedang aktif.</p>
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

        {/* 5. Danger zone */}
        {currentWorkspace && (
          <Card className="border border-destructive/30 bg-destructive/[0.03]">
            <CardHeader className="pb-3 border-b border-destructive/20">
              <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Zona Berbahaya
              </CardTitle>
              <CardDescription className="text-[11px]">Tindakan di bawah ini tidak dapat dibatalkan.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isOwner ? 'Hapus Workspace' : 'Keluar dari Workspace'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isOwner
                      ? 'Menghapus workspace akan menghapus semua proyek, tugas, dan catatan di dalamnya secara permanen.'
                      : 'Anda akan kehilangan akses ke semua proyek dan tugas di workspace ini.'}
                  </p>
                </div>
                <Button variant="destructive" size="sm" className="gap-1.5 shrink-0" onClick={() => setConfirmOpen(true)}>
                  {isOwner ? <Trash2 className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
                  {isOwner ? 'Hapus' : 'Keluar'}
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
              {isOwner ? 'Hapus workspace ini?' : 'Keluar dari workspace ini?'}
            </DialogTitle>
            <DialogDescription>
              {isOwner
                ? `"${currentWorkspace?.name}" beserta semua proyek, tugas, dan catatannya akan dihapus permanen. Ini tidak dapat dibatalkan.`
                : `Anda tidak akan bisa mengakses "${currentWorkspace?.name}" lagi kecuali diundang ulang.`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" disabled={confirmBusy} onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" className="flex-1 gap-1.5" disabled={confirmBusy} onClick={handleDangerConfirm}>
              {confirmBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {isOwner ? 'Hapus Permanen' : 'Ya, Keluar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
