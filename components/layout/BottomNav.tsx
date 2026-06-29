'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Plus } from 'lucide-react';

/**
 * Mobile-only bottom navigation with a centered floating action button.
 * Hidden on lg+ where the sidebar takes over.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { currentWorkspace } = useWorkspaceStore();
  const { setCommandPaletteOpen } = useUIStore();
  const slug = currentWorkspace?.slug || 'dashboard';

  const items = [
    { label: 'Beranda', href: `/${slug}/dashboard`, icon: LayoutDashboard },
    { label: 'Proyek', href: `/${slug}/projects`, icon: FolderKanban },
    { label: 'Tugas', href: `/${slug}/tasks`, icon: CheckSquare },
    { label: 'Kalender', href: `/${slug}/calendar`, icon: CalendarDays },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="relative grid grid-cols-5 h-16 items-center px-1">
        {items.slice(0, 2).map((item) => (
          <NavTab key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}

        {/* Center FAB */}
        <div className="flex items-center justify-center">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Aksi cepat"
            className="-mt-7 h-14 w-14 rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30 flex items-center justify-center ring-4 ring-background"
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        </div>

        {items.slice(2).map((item) => (
          <NavTab key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </div>
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

function NavTab({
  label, href, icon: Icon, active,
}: { label: string; href: string; icon: typeof Plus; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon className={cn('h-5 w-5', active && 'text-primary')} />
      <span>{label}</span>
    </Link>
  );
}
