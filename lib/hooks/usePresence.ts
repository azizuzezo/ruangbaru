'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

export type PresenceStatus = 'online' | 'away' | 'in_meeting' | 'editing' | 'viewing';

export interface PresenceMember {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: PresenceStatus;
  page: string;
  lastSeen: string;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Di Dashboard',
  tasks: 'Mengerjakan Tugas',
  projects: 'Melihat Proyek',
  calendar: 'Melihat Kalender',
  meetings: 'Di Halaman Rapat',
  notes: 'Menulis Catatan',
  team: 'Melihat Tim',
  settings: 'Pengaturan',
};

export function getPageLabel(page: string): string {
  for (const [key, label] of Object.entries(PAGE_LABELS)) {
    if (page.includes(key)) return label;
  }
  return 'Online';
}

export function usePresence(currentPage: string) {
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!currentWorkspace || !currentUser) return;

    const channel = supabase.channel(`presence:${currentWorkspace.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{
          fullName: string | null;
          avatarUrl: string | null;
          status: PresenceStatus;
          page: string;
          lastSeen: string;
        }>>;
        const online: PresenceMember[] = [];
        for (const [userId, presences] of Object.entries(state)) {
          const latest = presences[0];
          if (latest) {
            online.push({
              userId,
              fullName: latest.fullName || null,
              avatarUrl: latest.avatarUrl || null,
              status: latest.status || 'online',
              page: latest.page || '',
              lastSeen: latest.lastSeen || new Date().toISOString(),
            });
          }
        }
        setMembers(online.filter((m) => m.userId !== currentUser.id));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            fullName: currentUser.full_name,
            avatarUrl: currentUser.avatar_url,
            status: 'online' as PresenceStatus,
            page: currentPage,
            lastSeen: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    const handleVisibility = async () => {
      if (!channelRef.current) return;
      const newStatus: PresenceStatus = document.visibilityState === 'hidden' ? 'away' : 'online';
      await channelRef.current.track({
        fullName: currentUser.full_name,
        avatarUrl: currentUser.avatar_url,
        status: newStatus,
        page: currentPage,
        lastSeen: new Date().toISOString(),
      });
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, currentUser?.id, currentPage]);

  return members;
}
