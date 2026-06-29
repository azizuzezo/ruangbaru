import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace, Profile } from '@/types';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  currentUser: Profile | null;
  sidebarCollapsed: boolean;
  // Actions
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentUser: (user: Profile | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspace: null,
      workspaces: [],
      currentUser: null,
      sidebarCollapsed: false,

      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'ruangbaru-workspace',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
