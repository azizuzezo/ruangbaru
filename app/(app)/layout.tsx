'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { PageTransition } from '@/components/layout/PageTransition';
import { BottomNav } from '@/components/layout/BottomNav';
import { TourProvider } from '@/components/tour/TourProvider';
import { createClient } from '@/lib/supabase/client';

import { toast } from 'sonner';
import { Layers, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { slugify } from '@/lib/utils';
import type { Workspace } from '@/types';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { 
    currentWorkspace, 
    setCurrentWorkspace, 
    setWorkspaces, 
    workspaces,
    currentUser,
    setCurrentUser,
    sidebarCollapsed 
  } = useWorkspaceStore();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [loading, setLoading] = useState(true);
  const [createWsOpen, setCreateWsOpen] = useState(false);
  const [wsName, setWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);
  
  const supabase = createClient();

  // 1. Initial State Fetching
  useEffect(() => {
    async function initUserAndWorkspaces() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setCurrentUser(profile || {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Fetch Workspaces
        const { data: wsMembers } = await supabase
          .from('workspace_members')
          .select('workspaces(*)')
          .eq('user_id', user.id);

        const fetchedWorkspaces = (wsMembers?.map((m: any) => m.workspaces).filter(Boolean) || []) as Workspace[];
        setWorkspaces(fetchedWorkspaces);

        if (fetchedWorkspaces.length > 0) {
          if (!currentWorkspace || !fetchedWorkspaces.some(w => w.id === currentWorkspace.id)) {
            setCurrentWorkspace(fetchedWorkspaces[0]);
          }
        } else {
          // No workspaces exist, force create modal
          setCreateWsOpen(true);
        }
      } catch (err) {
        console.error('Error initializing app state:', err);
      } finally {
        setLoading(false);
      }
    }

    initUserAndWorkspaces();
  }, []);

  // 2. Workspace creation handler
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || !currentUser) return;
    setCreatingWs(true);

    try {
      const slug = `${slugify(wsName)}-${Math.floor(Math.random() * 1000)}`;
      
      // Insert workspace
      const { data: workspace, error: wsErr } = await supabase
        .from('workspaces')
        .insert({
          name: wsName,
          slug,
          owner_id: currentUser.id,
          plan: 'free',
        })
        .select()
        .single();

      if (wsErr) throw wsErr;

      // Insert membership
      const { error: memberErr } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: currentUser.id,
          role: 'owner',
        });

      if (memberErr) throw memberErr;

      toast.success(`Workspace "${wsName}" berhasil dibuat!`);
      const updatedWorkspaces = [...workspaces, workspace];
      setWorkspaces(updatedWorkspaces);
      setCurrentWorkspace(workspace);
      setCreateWsOpen(false);
      setWsName('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat workspace');
    } finally {
      setCreatingWs(false);
    }
  };

  // Keyboard shortcut listener (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Image src="/logo.png" alt="RuangBaru" width={48} height={48} className="rounded-xl animate-pulse" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Memuat ruang kerja Anda...</span>
        </div>
      </div>
    );
  }

  return (
    <TourProvider>
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main workspace panels */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-6 bg-background/50 relative">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* Command palette */}
      <CommandPalette />

      {/* Task detail sheet */}
      <TaskDetailSheet />


      {/* Force Workspace Creation Modal */}
      <Dialog open={createWsOpen} onOpenChange={(open) => !creatingWs && setCreateWsOpen(open)}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Buat Ruang Kerja Pertama Anda
            </DialogTitle>
            <DialogDescription>
              Untuk memulai kolaborasi, Anda memerlukan sebuah ruang kerja (workspace). Beri nama untuk tim Anda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Input
                placeholder="cth. Ruang Kerja Marketing, Agency HQ"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                disabled={creatingWs}
                required
                className="col-span-3"
              />
            </div>
            <Button type="submit" className="w-full" disabled={creatingWs || !wsName.trim()}>
              {creatingWs ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Membuat...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Buat Workspace Baru
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </TourProvider>
  );
}
