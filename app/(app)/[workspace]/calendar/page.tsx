'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { Loader2 } from 'lucide-react';
import { CalendarView } from '@/components/calendar/CalendarView';

export default function CalendarPage() {
  const { currentWorkspace, currentUser } = useWorkspaceStore();

  if (!currentWorkspace) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CalendarView
      workspaceId={currentWorkspace.id}
      wsSlug={currentWorkspace.slug}
      currentUser={currentUser}
    />
  );
}
