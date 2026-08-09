'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import { Loader2 } from 'lucide-react';
import type { Workspace } from '@/types';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    currentWorkspace,
    setCurrentWorkspace,
    setWorkspaces,
    setCurrentUser,
  } = useWorkspaceStore();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [loading, setLoading] = useState(true);

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
          // Landed on a workspace-scoped page (e.g. a stale bookmark, or
          // removed from their only workspace) with no workspace at all —
          // send them through the same join-or-create choice a brand-new
          // user gets, instead of a second, lesser "create workspace" modal.
          router.replace('/welcome');
          return;
        }
      } catch (err) {
        console.error('Error initializing app state:', err);
      } finally {
        setLoading(false);
      }
    }

    initUserAndWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [commandPaletteOpen, setCommandPaletteOpen]);

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
    </div>
    </TourProvider>
  );
}
