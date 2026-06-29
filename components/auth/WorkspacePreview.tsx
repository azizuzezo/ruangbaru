'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Bell, Plus, FolderKanban, Users } from 'lucide-react';

const E = [0.22, 1, 0.36, 1] as [number, number, number, number];
const BLUE = '#106CD8';
const TEAL = '#10B29F';
const YELLOW = '#FDB31A';

const TASK_CARDS = [
  { title: 'Desain halaman landing', tag: 'Sedang Berjalan', tagBg: 'rgba(255,255,255,0.2)', tagColor: '#fff', dot: TEAL, delay: 0 },
  { title: 'Review kontrak vendor', tag: 'Menunggu Review', tagBg: 'rgba(253,179,26,0.2)', tagColor: YELLOW, dot: YELLOW, delay: 0.18 },
  { title: 'Setup workspace tim', tag: 'Selesai', tagBg: 'rgba(16,178,159,0.2)', tagColor: TEAL, dot: TEAL, delay: 0.36, done: true },
];

const NOTIFS = [
  { text: 'Budi menyelesaikan tugas review', time: '3m', color: TEAL, letter: 'B' },
  { text: 'Rini mengomentari dokumen brief', time: '8m', color: YELLOW, letter: 'R' },
];

export function WorkspacePreview() {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTask, setActiveTask] = useState(0);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMouseX(((e.clientX - rect.left) / rect.width - 0.5) * 16);
      setMouseY(((e.clientY - rect.top) / rect.height - 0.5) * 10);
    };
    window.addEventListener('mousemove', fn, { passive: true });
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTask(i => (i + 1) % TASK_CARDS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full select-none">
      {/* Subtle light blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <motion.div
          animate={{ x: mouseX * 0.25, y: mouseY * 0.25 }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
          className="absolute top-[5%] right-[5%] h-56 w-56 rounded-full opacity-15 blur-3xl"
          style={{ background: `radial-gradient(circle, #7AB5F0, #60D9CF)` }}
        />
        <motion.div
          animate={{ x: mouseX * -0.15, y: mouseY * 0.3 }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className="absolute bottom-[10%] left-[0%] h-48 w-48 rounded-full opacity-12 blur-3xl"
          style={{ background: `radial-gradient(circle, ${TEAL}, #60D9CF)` }}
        />
      </div>

      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden />

      <div className="relative h-full flex flex-col justify-between p-8">
        {/* Top */}
        <div className="text-right">
          <a href="/" className="text-sm font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
            ← Kembali ke beranda
          </a>
        </div>

        {/* Center */}
        <div className="my-auto space-y-6">
          {/* Headline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: E }}>
            <h2 className="text-3xl font-extrabold tracking-tight leading-[1.18] text-white">
              Kelola proyek dan tim<br />
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>dalam satu tempat.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Workspace untuk proyek, tugas, catatan, dan anggota tim — tanpa perlu berpindah aplikasi.
            </p>
          </motion.div>

          {/* Task cards */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: E }} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <FolderKanban className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Proyek Aktif
              </span>
            </div>
            {TASK_CARDS.map((card, i) => (
              <motion.div key={card.title}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0, scale: activeTask === i ? 1.02 : 1 }}
                transition={{ duration: 0.4, delay: 0.3 + card.delay, ease: E }}
                className="rounded-xl border p-3.5 transition-all duration-300 cursor-default"
                style={{
                  borderColor: activeTask === i ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)',
                  background: activeTask === i ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)',
                }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0"
                      style={card.done ? { background: TEAL, borderColor: TEAL } : { borderColor: 'rgba(255,255,255,0.3)' }}>
                      {card.done && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <p className="text-sm font-medium leading-tight"
                      style={{ color: card.done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)', textDecoration: card.done ? 'line-through' : 'none' }}>
                      {card.title}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold"
                    style={{ background: card.tagBg, color: card.tagColor }}>
                    {card.tag}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: card.dot, opacity: 0.8 }} />
                  <div className="flex-1 h-1 rounded-full bg-white/10">
                    <div className="h-1 rounded-full" style={{ width: card.done ? '100%' : '55%', background: card.dot, opacity: 0.6 }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Team */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: E }}
            className="rounded-xl border border-white/10 bg-white/7 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Anggota Online
              </span>
              <span className="ml-auto flex items-center gap-1 text-[9px] font-semibold" style={{ color: TEAL }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: TEAL }} />3 aktif
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { c: BLUE, l: 'BS', name: 'Budi' },
                { c: TEAL, l: 'RA', name: 'Rini' },
                { c: '#8B5CF6', l: 'AF', name: 'Ahmad' },
              ].map((m, i) => (
                <motion.div key={m.l} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                  className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <span className="h-8 w-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white/15"
                      style={{ background: m.c }}>{m.l}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white/10"
                      style={{ background: TEAL }} />
                  </div>
                  <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7, ease: E }} className="space-y-2">
            {NOTIFS.map((n, i) => (
              <motion.div key={n.text}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.12, ease: E }}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/7 px-3 py-2.5">
                <Bell className="h-3 w-3 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
                <span className="h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
                  style={{ background: n.color }}>{n.letter}</span>
                <span className="flex-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.65)' }}>{n.text}</span>
                <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{n.time}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom — honest stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9, ease: E }}
          className="grid grid-cols-3 gap-3">
          {[
            { v: '5 menit', l: 'Setup workspace' },
            { v: 'Gratis', l: 'Untuk 5 anggota' },
            { v: '4 fitur', l: 'Kanban, Catatan, dst.' },
          ].map(s => (
            <div key={s.l} className="rounded-xl border border-white/10 bg-white/8 p-3 text-center">
              <p className="text-base font-extrabold text-white">{s.v}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.l}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
