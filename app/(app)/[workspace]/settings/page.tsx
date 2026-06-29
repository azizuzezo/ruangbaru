'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect } from 'react';
import {
  Settings, User, Layers, ShieldAlert,
  Save, Loader2, Sparkles, Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { currentWorkspace, currentUser, setCurrentWorkspace, setCurrentUser, workspaces, setWorkspaces } = useWorkspaceStore();
  
  // Workspace Settings State
  const [wsName, setWsName] = useState('');
  const [savingWs, setSavingWs] = useState(false);

  // Profile Settings State
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const supabase = createClient();

  // Upload an avatar to Supabase Storage (avatars/{uid}/...) and persist its URL.
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
    }
    if (currentUser) {
      setProfileName(currentUser.full_name || '');
      setProfileBio(currentUser.bio || '');
    }
  }, [currentWorkspace, currentUser]);

  // Save Workspace Settings
  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !currentWorkspace) return;
    setSavingWs(true);

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ name: wsName })
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

  // Save Profile Settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !currentUser) return;
    setSavingProfile(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          full_name: profileName,
          bio: profileBio
        })
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
          Pengaturan Sistem
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Ubah konfigurasi profil akun Anda dan nama workspace saat ini di sini.
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
              <Button type="submit" disabled={savingWs || !wsName.trim()} className="gap-1.5 h-9 text-xs">
                {savingWs ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
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
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarUpload}
                  />
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
                {savingProfile ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Perbarui Profil</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
