'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, CalendarDays, MessageSquare, Users } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const TEAL = '#10B29F';
const YELLOW = '#FDB31A';
const FONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

const ACTIVITY = [
  { who: 'Putri', what: 'menyelesaikan "Desain onboarding"', color: '#FFFFFF' },
  { who: 'Adi', what: 'mengomentari "Riset pengguna"', color: '#FFFFFF' },
  { who: 'Rani', what: 'menambahkan tugas baru', color: '#FFFFFF' },
];

const PRESENCE = [
  { name: 'PT', color: '#FDB31A' },
  { name: 'AD', color: '#10B29F' },
  { name: 'RN', color: '#FFFFFF' },
  { name: 'BD', color: '#7AB5F0' },
];

const TASKS = [
  { label: 'Desain halaman onboarding', pct: 60 },
  { label: 'Riset wawancara pengguna', pct: 25 },
  { label: 'Rilis versi 1.2', pct: 100 },
];

/**
 * Animated collaboration showcase for the left side of the auth screens.
 * Lives on a deep-brand gradient; cycles activity, animates progress,
 * and shows live presence — so signing in feels like entering a workspace.
 */
export function AuthShowcase() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ACTIVITY.length), 2800);
    return () => clearInterval(t);
  }, [reduce]);

  const a = ACTIVITY[idx];

  return (
    <div
      className="relative flex h-full flex-col justify-between overflow-hidden p-10 xl:p-12"
      style={{ background: 'linear-gradient(155deg, #0D59B4 0%, #106CD8 45%, #0A4590 100%)', fontFamily: FONT_BODY }}
    >
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: TEAL }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: YELLOW }} />
      {/* Dot texture */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]">
        <defs>
          <pattern id="auth-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="#fff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-dots)" />
      </svg>

      {/* Top — logo + headline */}
      <div className="relative">
        <Logo variant="icon" height={44} priority />
        <h2 className="mt-8 max-w-sm text-3xl font-black leading-tight tracking-tight text-white" style={{ fontFamily: FONT, letterSpacing: '-0.02em' }}>
          Tempat tim Anda bekerja, bersama.
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-blue-100">
          Proyek, tugas, dan kolaborasi tim — semuanya tersinkron secara real-time.
        </p>
      </div>

      {/* Middle — floating dashboard card */}
      <div className="relative my-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: E }}
          className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Proyek Tim Produk</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">3 aktif</span>
          </div>
          <div className="mt-3 space-y-2.5">
            {TASKS.map((t, i) => (
              <div key={t.label} className="rounded-xl bg-white/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  {t.pct === 100 ? (
                    <motion.span
                      initial={reduce ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.3 + i * 0.1 }}
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400"
                    >
                      <Check className="h-2.5 w-2.5 text-emerald-900" />
                    </motion.span>
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-white/40" />
                  )}
                  <span className={`text-[11px] ${t.pct === 100 ? 'text-blue-100 line-through' : 'text-white'}`}>{t.label}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${t.pct}%` }}
                    transition={{ duration: 0.9, delay: 0.2 + i * 0.12, ease: E }}
                    className="h-full rounded-full"
                    style={{ background: t.pct === 100 ? '#34D399' : '#fff' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* meta row */}
          <div className="mt-3 flex items-center gap-3 text-[10px] text-blue-100">
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> 12 Jul</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> 8</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 6</span>
          </div>
        </motion.div>

        {/* Floating activity chip */}
        <div className="relative mt-3 h-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: E }}
              className="absolute inset-0 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <p className="truncate text-[11px] text-blue-50">
                <span className="font-semibold text-white">{a.who}</span> {a.what}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom — presence */}
      <div className="relative flex items-center gap-3">
        <div className="flex -space-x-2">
          {PRESENCE.map((p) => (
            <span
              key={p.name}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold"
              style={{
                background: p.color,
                borderColor: '#106CD8',
                color: p.color === '#FFFFFF' ? '#106CD8' : '#fff',
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
        <span className="text-xs font-medium text-blue-100">4 anggota online sekarang</span>
      </div>
    </div>
  );
}

export default AuthShowcase;
