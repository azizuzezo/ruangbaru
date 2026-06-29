'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

/* Brand glyphs (lucide v1 dropped brand logos) */
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  );
}
function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

const BLUE = '#106CD8';
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

const COLUMNS = [
  {
    title: 'Produk',
    links: [
      { label: 'Fitur', href: '/fitur' },
      { label: 'Harga', href: '/harga' },
      { label: 'Cara Kerja', href: '/cara-kerja' },
      { label: 'Dokumentasi', href: '/cara-kerja' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang', href: '/about' },
      { label: 'Kontak', href: '/contact' },
      { label: 'Kebijakan Privasi', href: '/privacy-policy' },
      { label: 'Ketentuan Layanan', href: '/terms-of-service' },
    ],
  },
];

const SOCIALS = [
  { icon: XIcon, href: 'https://twitter.com', label: 'X' },
  { icon: InstagramIcon, href: 'https://instagram.com', label: 'Instagram' },
  { icon: LinkedinIcon, href: 'https://linkedin.com', label: 'LinkedIn' },
];

export function SiteFooter() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSent(true);
    setEmail('');
  };

  return (
    <footer className="border-t border-neutral-100 bg-neutral-50/60" style={{ fontFamily: FONT_BODY }}>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
          {/* Brand + social */}
          <div>
            <Logo variant="wordmark" tone="light" height={26} />
            <p className="mt-4 max-w-[240px] text-sm leading-6 text-neutral-500">
              Satu workspace untuk proyek, tugas, dan tim — dibuat untuk cara kerja tim Indonesia.
            </p>
            <p className="mt-4 text-sm text-neutral-500">
              Butuh bantuan?{' '}
              <a href="mailto:halo@ruangbaru.my.id" className="font-medium text-neutral-700 hover:text-[#106CD8]">
                halo@ruangbaru.my.id
              </a>
            </p>
            <div className="mt-5 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
                >
                  <s.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      prefetch
                      className="text-sm text-neutral-600 transition-colors hover:text-neutral-950"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Newsletter</h3>
            <p className="mt-4 text-sm leading-6 text-neutral-500">
              Tips produktivitas tim dan kabar fitur baru — sesekali, tanpa spam.
            </p>
            <form onSubmit={submit} className="mt-4">
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
                >
                  <Check className="h-4 w-4" /> Terima kasih sudah bergabung!
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-1 pl-3.5 shadow-sm focus-within:border-[#106CD8]">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@perusahaan.com"
                    className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
                  />
                  <button
                    type="submit"
                    aria-label="Berlangganan"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ background: BLUE }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} RuangBaru · Dibuat oleh{' '}
            <a href="https://duacincin.id" target="_blank" rel="noreferrer" className="font-medium text-neutral-500 transition-colors hover:text-neutral-800">
              duacincin.id
            </a>
          </p>
          <div className="flex gap-5 text-xs text-neutral-400">
            <Link href="/privacy-policy" className="transition-colors hover:text-neutral-700">Privasi</Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-neutral-700">Ketentuan</Link>
            <Link href="/contact" className="transition-colors hover:text-neutral-700">Kontak</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
