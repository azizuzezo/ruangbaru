'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowRight, Check,
  FolderKanban, CalendarDays, StickyNote, Users, ListTodo,
  ChevronRight,
} from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const YELLOW = '#FDB31A';
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];
const FONT = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const DFONT = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: E }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ── Interactive Kanban preview ─────────────────────────── */
const INIT_CARDS = [
  { id: 1, title: 'Desain halaman login', col: 0 },
  { id: 2, title: 'Review brief klien', col: 0 },
  { id: 3, title: 'Update dokumentasi', col: 1 },
  { id: 4, title: 'Deploy ke staging', col: 2 },
];

function KanbanPreview() {
  const [cards, setCards] = useState(INIT_CARDS);
  const cols = ['Perlu Dikerjakan', 'Sedang Berjalan', 'Selesai'];
  const colColors = [BLUE, YELLOW, TEAL];

  const move = (id: number, dir: 1 | -1) => {
    setCards(cs => cs.map(c => c.id === id
      ? { ...c, col: Math.max(0, Math.min(2, c.col + dir)) }
      : c));
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {cols.map((col, ci) => (
        <div key={col} className="rounded-xl bg-neutral-50 p-3 min-h-[160px]">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="h-2 w-2 rounded-full" style={{ background: colColors[ci] }} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{col}</p>
          </div>
          <div className="space-y-1.5">
            {cards.filter(c => c.col === ci).map(card => (
              <motion.div key={card.id} layoutId={`k-${card.id}`}
                className="rounded-lg border border-neutral-200 bg-white p-2.5 cursor-pointer select-none group"
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                whileHover={{ y: -1, boxShadow: '0 3px 8px rgba(0,0,0,0.08)' }}>
                <p className="text-[11px] font-medium text-neutral-800">{card.title}</p>
                <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ci > 0 && (
                    <button onClick={() => move(card.id, -1)}
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors">
                      ← Balik
                    </button>
                  )}
                  {ci < 2 && (
                    <button onClick={() => move(card.id, 1)}
                      className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-white transition-colors"
                      style={{ background: colColors[ci + 1] }}>
                      Maju →
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Checklist preview ──────────────────────────────────── */
const INIT_TASKS = [
  { id: 1, label: 'Kirim proposal klien', done: true },
  { id: 2, label: 'Review desain landing', done: false },
  { id: 3, label: 'Meeting standup 09:00', done: false },
  { id: 4, label: 'Update CHANGELOG', done: true },
];

function ChecklistPreview() {
  const [tasks, setTasks] = useState(INIT_TASKS);
  const toggle = (id: number) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));

  return (
    <div className="space-y-2">
      {tasks.map(t => (
        <motion.button key={t.id} onClick={() => toggle(t.id)}
          className="w-full flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left hover:border-neutral-200 transition-colors"
          whileTap={{ scale: 0.99 }}>
          <motion.span animate={{ scale: t.done ? [1.2, 1] : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0"
            style={{ borderColor: t.done ? TEAL : '#D1D5DB', background: t.done ? TEAL : 'white' }}>
            {t.done && <Check className="h-3 w-3 text-white" />}
          </motion.span>
          <span className="text-sm font-medium transition-colors"
            style={{ color: t.done ? '#9CA3AF' : '#111827', textDecoration: t.done ? 'line-through' : 'none' }}>
            {t.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

/* ── Calendar preview ───────────────────────────────────── */
function CalendarPreview() {
  const [selected, setSelected] = useState<number[]>([5, 12, 19]);
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const toggle = (d: number) => setSelected(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
          <div key={d} className="text-center text-[9px] font-semibold text-neutral-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => (
          <motion.button key={d} onClick={() => toggle(d)}
            className="aspect-square rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center"
            style={{
              background: selected.includes(d) ? BLUE : '#F9FAFB',
              color: selected.includes(d) ? '#fff' : '#374151',
            }}
            whileTap={{ scale: 0.9 }}>
            {d}
          </motion.button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="mt-3 text-[10px] text-neutral-500 font-medium">
          {selected.length} hari dipilih — klik untuk tambah/hapus event
        </p>
      )}
    </div>
  );
}

/* ── Team preview ───────────────────────────────────────── */
const TEAM = [
  { name: 'Budi Santoso', role: 'Admin', color: BLUE, initials: 'BS', online: true },
  { name: 'Rani Amalia', role: 'Anggota', color: TEAL, initials: 'RA', online: true },
  { name: 'Ahmad Fajar', role: 'Anggota', color: '#8B5CF6', initials: 'AF', online: false },
  { name: 'Dewi Kurnia', role: 'Anggota', color: YELLOW, initials: 'DK', online: false },
];

function TeamPreview() {
  const [revealed, setRevealed] = useState<number[]>([]);
  const toggle = (i: number) => setRevealed(r => r.includes(i) ? r.filter(x => x !== i) : [...r, i]);

  return (
    <div className="space-y-2">
      {TEAM.map((m, i) => (
        <motion.button key={m.name} onClick={() => toggle(i)}
          className="w-full flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left hover:border-neutral-200 transition-colors"
          whileTap={{ scale: 0.99 }}>
          <span className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: m.color }}>{m.initials}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{m.name}</p>
            <p className="text-xs text-neutral-500">{m.role}</p>
          </div>
          <AnimatePresence>
            {revealed.includes(i) && (
              <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{
                  background: m.online ? '#D1FAE5' : '#F3F4F6',
                  color: m.online ? '#065F46' : '#6B7280',
                }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.online ? '#10B981' : '#9CA3AF' }} />
                {m.online ? 'Online' : 'Offline'}
              </motion.span>
            )}
          </AnimatePresence>
          {!revealed.includes(i) && (
            <ChevronRight className="h-4 w-4 text-neutral-300" />
          )}
        </motion.button>
      ))}
    </div>
  );
}

/* ── Feature tabs ───────────────────────────────────────── */
const FEATURES = [
  {
    id: 'kanban',
    label: 'Proyek & Kanban',
    icon: <FolderKanban className="h-5 w-5" />,
    desc: 'Atur pekerjaan dalam papan visual. Geser kartu antar kolom dan lacak progress setiap task.',
    color: BLUE,
    preview: <KanbanPreview />,
  },
  {
    id: 'tugas',
    label: 'Daftar Tugas',
    icon: <ListTodo className="h-5 w-5" />,
    desc: 'Kelola tugas harian dengan prioritas dan tenggat waktu. Centang ketika selesai.',
    color: TEAL,
    preview: <ChecklistPreview />,
  },
  {
    id: 'kalender',
    label: 'Kalender Tim',
    icon: <CalendarDays className="h-5 w-5" />,
    desc: 'Lihat jadwal tim dalam satu tampilan. Klik tanggal untuk menambah atau menghapus event.',
    color: '#8B5CF6',
    preview: <CalendarPreview />,
  },
  {
    id: 'tim',
    label: 'Manajemen Tim',
    icon: <Users className="h-5 w-5" />,
    desc: 'Undang anggota, atur peran, dan pantau status kehadiran tim secara real-time.',
    color: YELLOW,
    preview: <TeamPreview />,
  },
];

/* ── Page ───────────────────────────────────────────────── */
export default function FiturPage() {
  const [active, setActive] = useState(0);

  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: FONT }}>
      <MarketingHeader />

      {/* Hero */}
      <section className="border-b border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: E }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 shadow-sm mb-5">
              <FolderKanban className="h-3.5 w-3.5" style={{ color: BLUE }} />
              Fitur RuangBaru
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl"
              style={{ fontFamily: DFONT }}>
              Semua yang tim kecil butuhkan
            </h1>
            <p className="mt-4 text-lg text-neutral-600 max-w-xl mx-auto">
              Empat modul utama yang terintegrasi. Tidak perlu berpindah aplikasi — semuanya ada di satu workspace.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/register">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: BLUE }}
                  whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}>
                  Mulai gratis <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive features */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Tab list */}
            <div className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:pb-0">
              {FEATURES.map((f, i) => (
                <button key={f.id} onClick={() => setActive(i)}
                  className="group shrink-0 flex flex-col gap-2.5 rounded-2xl border p-5 text-left transition-all"
                  style={{
                    borderColor: active === i ? `${f.color}40` : '#E5E7EB',
                    background: active === i ? '#fff' : 'transparent',
                    boxShadow: active === i ? '0 2px 8px rgba(0,0,0,0.07)' : 'none',
                  }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
                    style={{
                      background: active === i ? `${f.color}15` : '#F3F4F6',
                      color: active === i ? f.color : '#9CA3AF',
                    }}>
                    {f.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{f.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-neutral-500 hidden lg:block">{f.desc}</p>
                  </div>
                  {active === i && (
                    <motion.div className="h-0.5 w-full rounded-full" style={{ background: f.color }}
                      layoutId="feat-underline" />
                  )}
                </button>
              ))}
            </div>

            {/* Preview panel */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm min-h-[360px]">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-neutral-900" style={{ fontFamily: DFONT }}>
                  {FEATURES[active].label}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">{FEATURES[active].desc}</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={active}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: E }}>
                  {FEATURES[active].preview}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-neutral-100 bg-[#F9FAFB] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <FadeIn className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-neutral-900" style={{ fontFamily: DFONT }}>
              Dirancang untuk produktivitas tim
            </h2>
          </FadeIn>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Semua terhubung', desc: 'Tugas, proyek, kalender, dan tim saling terhubung otomatis.', color: BLUE },
              { title: 'Berbasis web', desc: 'Akses dari browser mana saja, tanpa instalasi.', color: TEAL },
              { title: 'Aman dan privat', desc: 'Data tim Anda tersimpan aman dengan enkripsi.', color: '#8B5CF6' },
              { title: 'Untuk tim Indonesia', desc: 'Antarmuka Bahasa Indonesia, harga lokal.', color: YELLOW },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.07}>
                <div className="card-interactive h-full overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6">
                  <span className="block h-1 w-10 rounded-full" style={{ background: item.color }} />
                  <h3 className="mt-4 text-sm font-semibold text-neutral-900">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn>
            <h2 className="text-3xl font-extrabold text-neutral-900" style={{ fontFamily: DFONT }}>
              Siap mencoba semua fiturnya?
            </h2>
            <p className="mt-3 text-neutral-600">Gratis untuk tim hingga 5 anggota. Tidak perlu kartu kredit.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register">
                <motion.button
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ background: BLUE }}
                  whileHover={{ opacity: 0.88 }} whileTap={{ scale: 0.97 }}>
                  Buat workspace gratis <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <Link href="/harga" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                Lihat harga →
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
