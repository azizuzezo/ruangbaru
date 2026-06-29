'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/stores/ui-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useRouter } from 'next/navigation';
import {
  Search, LayoutDashboard, FolderKanban, CheckSquare,
  CalendarDays, StickyNote, Users, Settings
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();

  const [search, setSearch] = useState('');

  const activeWorkspaceSlug = currentWorkspace?.slug || 'dashboard';

  const commands = [
    { label: 'Buka Dashboard', icon: LayoutDashboard, action: () => router.push(`/${activeWorkspaceSlug}/dashboard`) },
    { label: 'Lihat Daftar Proyek', icon: FolderKanban, action: () => router.push(`/${activeWorkspaceSlug}/projects`) },
    { label: 'Lihat Daftar Tugas', icon: CheckSquare, action: () => router.push(`/${activeWorkspaceSlug}/tasks`) },
    { label: 'Buka Kalender', icon: CalendarDays, action: () => router.push(`/${activeWorkspaceSlug}/calendar`) },
    { label: 'Buka Catatan', icon: StickyNote, action: () => router.push(`/${activeWorkspaceSlug}/notes`) },
    { label: 'Manajemen Tim', icon: Users, action: () => router.push(`/${activeWorkspaceSlug}/team`) },
    { label: 'Pengaturan Workspace', icon: Settings, action: () => router.push(`/${activeWorkspaceSlug}/settings`) },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border border-border shadow-2xl rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Ketik perintah atau cari navigasi cepat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-0 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground text-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 divide-y divide-border/20">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Tidak ada hasil pencarian ditemukan
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.label}
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-muted-foreground hover:font-bold"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-foreground">{cmd.label}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground/80 font-mono">
                    Buka
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
