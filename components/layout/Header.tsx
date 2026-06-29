'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn, getInitials } from '@/lib/utils';
import {
  Bell, Search, Sparkles, Layers,
  ChevronRight, Calendar, Settings, FolderKanban, Users, LogOut, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/lib/supabase/actions';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Notification } from '@/types';
import { formatRelativeTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function Header() {
  const pathname = usePathname();
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { setCommandPaletteOpen, notificationPanelOpen, setNotificationPanelOpen } = useUIStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(true);

  const supabase = createClient();

  // Fetch real-time user notifications
  useEffect(() => {
    if (!currentUser) return;
    const currentUserId = currentUser.id;

    async function fetchNotifications() {
      setNotifLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const notificationsList = data as Notification[];
        setNotifications(notificationsList);
        setUnreadCount(notificationsList.filter((n) => !n.read).length);
      }
      setNotifLoading(false);
    }

    fetchNotifications();

    // Subscribe to notifications updates
    const channel = supabase
      .channel(`user-notifications-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload: any) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 10));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Mark all as read handler
  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id);
    
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Derive page breadcrumbs from path
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return [{ label: 'Dashboard', icon: Layers }];

    // Skip the workspace slug (parts[0])
    const pathLabel = parts[1];
    switch (pathLabel) {
      case 'dashboard':
        return [{ label: 'Dashboard', icon: Layers }];
      case 'projects':
        return [{ label: 'Proyek', icon: FolderKanban }];
      case 'tasks':
        return [{ label: 'Tugas', icon: FolderKanban }];
      case 'calendar':
        return [{ label: 'Kalender', icon: Calendar }];
      case 'notes':
        return [{ label: 'Catatan', icon: Layers }];
      case 'team':
        return [{ label: 'Tim', icon: Users }];
      case 'settings':
        return [{ label: 'Pengaturan', icon: Settings }];
      case 'billing':
        return [{ label: 'Tagihan', icon: Settings }];
      default:
        return [{ label: 'Workspace', icon: Layers }];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 select-none">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xs">
          {currentWorkspace?.name || 'Workspace'}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        {breadcrumbs.map((b, idx) => (
          <div key={idx} className="flex items-center gap-1.5 font-bold text-foreground">
            <span className="text-xs">{b.label}</span>
          </div>
        ))}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search Input Bar Trigger */}
        <button
          data-tour="global-search"
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 h-9 w-48 lg:w-64 border border-input rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground hover:border-ring/50 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-left flex-1">Cari...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[9px] font-medium opacity-100">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>

        {/* Mobile Search Button */}
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setCommandPaletteOpen(true)}>
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications Popover Dropdown */}
        <DropdownMenu open={notificationPanelOpen} onOpenChange={setNotificationPanelOpen}>
          <DropdownMenuTrigger asChild>
            <Button data-tour="notifications" variant="ghost" size="icon" className="relative rounded-lg h-9 w-9 text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-3 min-w-3 px-1 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center pulse-ring">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 bg-muted/40 border-b border-border">
              <span className="text-xs font-bold text-foreground">Notifikasi</span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifLoading ? (
                <div className="space-y-px divide-y divide-border">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3.5 flex flex-col gap-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-full" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Tidak ada notifikasi baru
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem 
                    key={n.id} 
                    className={cn(
                      "p-3.5 focus:bg-accent/40 flex flex-col items-start gap-1 cursor-pointer",
                      !n.read && "bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <span className="text-[11px] font-bold text-foreground flex-1">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    {n.body && <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{n.body}</p>}
                    <span className="text-[9px] text-muted-foreground/80 mt-1">{formatRelativeTime(n.created_at)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Workspace Quick Actions */}
        <Badge variant="success" className="gap-1 hidden md:inline-flex py-1 px-2.5">
          <Sparkles className="h-3 w-3 text-emerald-500 fill-current" />
          <span>Workspace Aktif</span>
        </Badge>

        {/* Mobile profile/menu (sidebar is hidden on mobile) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="lg:hidden">
            <button className="rounded-full active:scale-95 transition-transform">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={currentUser?.avatar_url || ''} />
                <AvatarFallback className="text-[10px]">{getInitials(currentUser?.full_name)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">
              {currentUser?.full_name || currentUser?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${currentWorkspace?.slug}/notes`}><Layers className="h-4 w-4 mr-2" /> Catatan</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${currentWorkspace?.slug}/team`}><Users className="h-4 w-4 mr-2" /> Anggota Tim</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${currentWorkspace?.slug}/settings`}><Settings className="h-4 w-4 mr-2" /> Pengaturan</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${currentWorkspace?.slug}/billing`}><CreditCard className="h-4 w-4 mr-2" /> Tagihan</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => { try { await signOut(); } catch (err: any) { if (!err?.digest?.startsWith('NEXT_REDIRECT')) toast.error('Gagal keluar.'); } }}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
