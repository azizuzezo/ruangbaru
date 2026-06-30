'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn, getInitials } from '@/lib/utils';
import { 
  ChevronDown, LayoutDashboard, FolderKanban, CheckSquare,
  CalendarDays, StickyNote, Users, Settings, CreditCard,
  Menu, ChevronLeft, LogOut, Plus, ShieldCheck, Video
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/supabase/actions';
import { toast } from 'sonner';

export function Sidebar() {
  const pathname = usePathname();
  const { 
    currentWorkspace, 
    setCurrentWorkspace, 
    workspaces, 
    currentUser,
    sidebarCollapsed,
    toggleSidebar
  } = useWorkspaceStore();
  const { setCommandPaletteOpen, setIsLoggingOut } = useUIStore();
  
  const activeWorkspaceSlug = currentWorkspace?.slug || 'dashboard';

  const menuItems = [
    { label: 'Dashboard', href: `/${activeWorkspaceSlug}/dashboard`, icon: LayoutDashboard, tour: 'dashboard' },
    { label: 'Proyek', href: `/${activeWorkspaceSlug}/projects`, icon: FolderKanban, tour: 'projects' },
    { label: 'Tugas', href: `/${activeWorkspaceSlug}/tasks`, icon: CheckSquare, tour: 'tasks' },
    { label: 'Kalender', href: `/${activeWorkspaceSlug}/calendar`, icon: CalendarDays, tour: 'calendar' },
    { label: 'Rapat', href: `/${activeWorkspaceSlug}/meetings`, icon: Video, tour: 'meetings' },
    { label: 'Catatan', href: `/${activeWorkspaceSlug}/notes`, icon: StickyNote, tour: 'notes' },
    { label: 'Anggota Tim', href: `/${activeWorkspaceSlug}/team`, icon: Users, tour: 'team' },
    { label: 'Pengaturan', href: `/${activeWorkspaceSlug}/settings`, icon: Settings, tour: 'settings' },
    { label: 'Tagihan', href: `/${activeWorkspaceSlug}/billing`, icon: CreditCard, tour: 'billing' },
  ];

  const handleLogout = () => {
    setIsLoggingOut(true);
  };

  return (
    <aside
      className={cn(
        "h-full hidden lg:flex flex-col bg-sidebar-bg border-r border-sidebar-border sidebar-transition shrink-0 z-20",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Workspace Switcher Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-sidebar-border px-4 justify-between",
        sidebarCollapsed && "justify-center px-0"
      )}>
        {sidebarCollapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center border border-sidebar-border hover:bg-accent/40 active:scale-95 transition-transform bg-background">
                {currentWorkspace?.logo_url ? (
                  <Image src={currentWorkspace.logo_url} alt={currentWorkspace.name} width={28} height={28} />
                ) : (
                  <span className="font-semibold text-xs text-primary">{getInitials(currentWorkspace?.name)}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel>Ganti Ruang Kerja</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((ws) => (
                <DropdownMenuItem 
                  key={ws.id}
                  onClick={() => setCurrentWorkspace(ws)}
                  className={cn(
                    "flex items-center gap-2",
                    currentWorkspace?.id === ws.id && "bg-accent"
                  )}
                >
                  <span className="h-5 w-5 bg-primary/10 text-primary flex items-center justify-center rounded text-[10px] font-bold">
                    {getInitials(ws.name)}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between px-2 hover:bg-accent/40 h-10">
                <div className="flex items-center gap-2 text-left min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    {getInitials(currentWorkspace?.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate leading-none mb-0.5">{currentWorkspace?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate leading-none capitalize">{currentWorkspace?.plan} plan</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Pilih Ruang Kerja</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((ws) => (
                <DropdownMenuItem 
                  key={ws.id}
                  onClick={() => setCurrentWorkspace(ws)}
                  className={cn(
                    "flex items-center justify-between",
                    currentWorkspace?.id === ws.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-5 w-5 bg-primary/10 text-primary flex items-center justify-center rounded text-[10px] font-bold shrink-0">
                      {getInitials(ws.name)}
                    </span>
                    <span className="truncate text-xs">{ws.name}</span>
                  </div>
                  {ws.plan === 'pro' && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-bold uppercase shrink-0">Pro</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href) || (item.label === 'Dashboard' && pathname.endsWith('/dashboard'));
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Link href={item.href}>
                <span data-tour={`nav-${item.tour}`} className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all relative group cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                  sidebarCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                )}>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0 relative z-10", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {!sidebarCollapsed && <span className="relative z-10">{item.label}</span>}

                  {/* Tooltip for collapsed mode */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-neutral-100 text-xs font-semibold rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none">
                      {item.label}
                    </div>
                  )}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* User Card & Sidebar Toggle */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Collapse Button */}
        <button 
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg border border-sidebar-border bg-background/50 text-muted-foreground hover:text-foreground active:scale-95 transition-all text-xs gap-2"
        >
          {sidebarCollapsed ? (
            <ChevronLeft className="h-4 w-4 rotate-180" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Sembunyikan Menu</span>
            </>
          )}
        </button>

        {/* User profile details */}
        {sidebarCollapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 rounded-full mx-auto flex overflow-hidden border border-sidebar-border hover:opacity-90 active:scale-95 transition-all bg-muted">
                <Avatar className="h-full w-full">
                  <AvatarImage src={currentUser?.avatar_url || ''} />
                  <AvatarFallback className="text-xs">{getInitials(currentUser?.full_name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{currentUser?.full_name || currentUser?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center justify-between p-2 bg-card rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser?.avatar_url || ''} />
                <AvatarFallback>{getInitials(currentUser?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate leading-none mb-0.5">{currentUser?.full_name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-none">{currentUser?.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
              title="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
