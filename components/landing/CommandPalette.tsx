'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FolderKanban, CreditCard, Workflow, LogIn, UserPlus,
  Home, Mail, ArrowRight,
} from 'lucide-react';

const BLUE = '#106CD8';
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Item = { icon: React.ElementType; label: string; href: string; group: string; keywords?: string };

const ITEMS: Item[] = [
  { icon: Home, label: 'Beranda', href: '/', group: 'Navigasi' },
  { icon: FolderKanban, label: 'Fitur', href: '/fitur', group: 'Navigasi', keywords: 'features kanban tugas' },
  { icon: Workflow, label: 'Cara Kerja', href: '/cara-kerja', group: 'Navigasi', keywords: 'how it works langkah' },
  { icon: CreditCard, label: 'Harga', href: '/harga', group: 'Navigasi', keywords: 'pricing paket biaya' },
  { icon: Mail, label: 'Kontak', href: '/contact', group: 'Navigasi' },
  { icon: LogIn, label: 'Masuk ke workspace', href: '/login', group: 'Aksi', keywords: 'login sign in' },
  { icon: UserPlus, label: 'Buat akun gratis', href: '/register', group: 'Aksi', keywords: 'daftar register sign up' },
];

const GROUPS = ['Navigasi', 'Aksi'];

const OPEN_EVENT = 'ruangbaru:open-command';

/** Open the command palette from anywhere (decoupled from the header). */
export function openCommandPalette() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Hook: returns palette state + listens for ⌘K and the global open event. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  return { open, setOpen };
}

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();

  // Prefetch destinations so navigation feels instant.
  useEffect(() => {
    if (open) ITEMS.forEach((i) => router.prefetch(i.href));
  }, [open, router]);

  const go = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          style={{ fontFamily: FONT_BODY }}
        >
          <button
            aria-label="Tutup"
            className="absolute inset-0 bg-neutral-950/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: E }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
          >
            <Command loop className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-neutral-400">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 px-4">
                <Search className="h-4 w-4 text-neutral-400" />
                <Command.Input
                  autoFocus
                  placeholder="Cari halaman atau aksi…"
                  className="h-12 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">ESC</kbd>
              </div>
              <Command.List className="max-h-[320px] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-neutral-400">
                  Tidak ada hasil.
                </Command.Empty>
                {GROUPS.map((group) => (
                  <Command.Group key={group} heading={group}>
                    {ITEMS.filter((i) => i.group === group).map((item) => (
                      <Command.Item
                        key={item.href}
                        value={`${item.label} ${item.keywords ?? ''}`}
                        onSelect={() => go(item.href)}
                        className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-700 aria-selected:bg-[#EBF3FD] aria-selected:text-[#106CD8]"
                      >
                        <item.icon className="h-4 w-4 text-neutral-400 group-aria-selected:text-[#106CD8]" />
                        <span className="flex-1">{item.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-aria-selected:opacity-100" style={{ color: BLUE }} />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;
