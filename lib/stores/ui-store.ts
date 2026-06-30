import { create } from 'zustand';

interface UIState {
  commandPaletteOpen: boolean;
  searchQuery: string;
  taskDetailOpen: boolean;
  taskDetailId: string | null;
  notificationPanelOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  isLoggingOut: boolean;
  // Actions
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setTaskDetailOpen: (open: boolean, taskId?: string | null) => void;
  setNotificationPanelOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setIsLoggingOut: (loggingOut: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  commandPaletteOpen: false,
  searchQuery: '',
  taskDetailOpen: false,
  taskDetailId: null,
  notificationPanelOpen: false,
  theme: 'system',
  isLoggingOut: false,

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTaskDetailOpen: (open, taskId = null) =>
    set({ taskDetailOpen: open, taskDetailId: taskId }),
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),
  setTheme: (theme) => set({ theme }),
  setIsLoggingOut: (loggingOut) => set({ isLoggingOut: loggingOut }),
}));
