'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Menu, X, Search } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { CommandPalette, useCommandPalette } from '@/components/landing/CommandPalette';
import { ChatWidget } from '@/components/landing/ChatWidget';

const BLUE = '#106CD8';
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const NAV_LINKS = [
  { label: 'Fitur', href: '/fitur' },
  { label: 'Cara Kerja', href: '/cara-kerja' },
  { label: 'Harga', href: '/harga' },
];

/**
 * Single source of truth for the marketing header. Identical structure,
 * height (72px), and logo position on every marketing page — the active
 * link is the only thing that changes, so navigating never shifts layout.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-neutral-100 bg-white/85"
        style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', fontFamily: FONT_BODY }}
      >
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center transition-transform hover:scale-[1.03]" aria-label="RuangBaru — beranda">
            <Logo variant="wordmark" height={36} priority />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    color: active ? BLUE : '#525252',
                    background: active ? '#EBF3FD' : 'transparent',
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => setCmdOpen(true)}
              aria-label="Cari"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white/60 px-2.5 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="font-sans text-[10px]">⌘K</kbd>
            </button>
            <Link
              href="/login"
              prefetch
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              prefetch
              className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
              style={{ background: BLUE }}
            >
              Coba Gratis
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button className="rounded-md p-1.5 text-neutral-600 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-neutral-100 bg-white md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium"
                    style={{ color: pathname === l.href ? BLUE : '#374151' }}
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-2 flex gap-2 border-t border-neutral-100 pt-3">
                  <Link href="/login" className="flex-1">
                    <button className="w-full rounded-lg border border-neutral-200 py-2 text-sm font-medium text-neutral-700">Masuk</button>
                  </Link>
                  <Link href="/register" className="flex-1">
                    <button className="w-full rounded-lg py-2 text-sm font-semibold text-white" style={{ background: BLUE }}>Coba Gratis</button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
      <ChatWidget />
    </>
  );
}

export default MarketingHeader;
