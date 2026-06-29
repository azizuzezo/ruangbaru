'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, Reorder, useReducedMotion } from 'framer-motion';
import {
  Check, Clock, CalendarDays, MessageSquare, Plus, Search, Bell, GripVertical,
} from 'lucide-react';
import { openCommandPalette } from '@/components/landing/CommandPalette';

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const YELLOW = '#FDB31A';
const FONT_BODY = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

type ColKey = 'todo' | 'doing' | 'done';
type Card = {
  id: string;
  title: string;
  col: ColKey;
  assignee: { name: string; color: string };
  due: string;
  checklist: [number, number];
  comments: number;
};

const WORKSPACES = [
  { id: 'produk', label: 'Tim Produk', accent: BLUE },
  { id: 'marketing', label: 'Marketing', accent: TEAL },
  { id: 'operasional', label: 'Operasional', accent: YELLOW },
] as const;

const BOARDS: Record<string, Card[]> = {
  produk: [
    { id: 'p1', title: 'Desain halaman onboarding', col: 'doing', assignee: { name: 'Putri', color: BLUE }, due: '2 hari', checklist: [3, 5], comments: 4 },
    { id: 'p2', title: 'Riset wawancara pengguna', col: 'todo', assignee: { name: 'Adi', color: TEAL }, due: 'Minggu ini', checklist: [0, 3], comments: 1 },
    { id: 'p3', title: 'Spesifikasi fitur kalender', col: 'todo', assignee: { name: 'Rani', color: YELLOW }, due: '5 hari', checklist: [1, 4], comments: 2 },
    { id: 'p4', title: 'Rilis versi 1.2', col: 'done', assignee: { name: 'Budi', color: '#8B5CF6' }, due: 'Selesai', checklist: [6, 6], comments: 8 },
  ],
  marketing: [
    { id: 'm1', title: 'Kampanye peluncuran Q3', col: 'doing', assignee: { name: 'Sari', color: TEAL }, due: '3 hari', checklist: [2, 6], comments: 5 },
    { id: 'm2', title: 'Konten media sosial', col: 'todo', assignee: { name: 'Dewi', color: BLUE }, due: 'Besok', checklist: [4, 8], comments: 3 },
    { id: 'm3', title: 'Newsletter bulanan', col: 'done', assignee: { name: 'Tono', color: YELLOW }, due: 'Selesai', checklist: [5, 5], comments: 2 },
  ],
  operasional: [
    { id: 'o1', title: 'Review kontrak vendor', col: 'todo', assignee: { name: 'Joko', color: YELLOW }, due: 'Minggu ini', checklist: [1, 4], comments: 1 },
    { id: 'o2', title: 'Onboarding karyawan baru', col: 'doing', assignee: { name: 'Mira', color: BLUE }, due: '4 hari', checklist: [3, 7], comments: 6 },
    { id: 'o3', title: 'Audit anggaran triwulan', col: 'done', assignee: { name: 'Hadi', color: TEAL }, due: 'Selesai', checklist: [9, 9], comments: 4 },
  ],
};

const COLUMNS: { key: ColKey; label: string; dot: string }[] = [
  { key: 'todo', label: 'Akan Dikerjakan', dot: '#9CA3AF' },
  { key: 'doing', label: 'Sedang Berjalan', dot: BLUE },
  { key: 'done', label: 'Selesai', dot: TEAL },
];

const ACTIVITY = [
  { who: 'Putri', what: 'memindahkan kartu ke Selesai', color: BLUE },
  { who: 'Adi', what: 'menambahkan komentar baru', color: TEAL },
  { who: 'Rani', what: 'menyelesaikan 2 sub-tugas', color: YELLOW },
  { who: 'Budi', what: 'mengundang anggota baru', color: '#8B5CF6' },
];

const PRESENCE = [
  { name: 'Putri', color: BLUE },
  { name: 'Adi', color: TEAL },
  { name: 'Rani', color: YELLOW },
  { name: 'Budi', color: '#8B5CF6' },
];

const NOTIFICATIONS = [
  { who: 'Adi', what: 'menyebut Anda di "Riset pengguna"', time: '2 mnt', color: TEAL },
  { who: 'Putri', what: 'menugaskan "Desain onboarding" ke Anda', time: '18 mnt', color: BLUE },
  { who: 'Rani', what: 'mengomentari kartu kalender', time: '1 jam', color: YELLOW },
];

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function groupByCol(cards: Card[]): Record<ColKey, Card[]> {
  return {
    todo: cards.filter((c) => c.col === 'todo'),
    doing: cards.filter((c) => c.col === 'doing'),
    done: cards.filter((c) => c.col === 'done'),
  };
}

export function HeroPreview() {
  const reduce = useReducedMotion();
  const [ws, setWs] = useState<string>('produk');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activityIdx, setActivityIdx] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);

  const accent = useMemo(() => WORKSPACES.find((w) => w.id === ws)!.accent, [ws]);
  const [board, setBoard] = useState<Record<ColKey, Card[]>>(() => groupByCol(BOARDS['produk']));

  // Reset board when the workspace switches.
  useEffect(() => {
    setBoard(groupByCol(BOARDS[ws]));
    setExpanded(null);
  }, [ws]);

  // Live activity feed.
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setActivityIdx((i) => (i + 1) % ACTIVITY.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  const current = ACTIVITY[activityIdx];
  const totalCards = board.todo.length + board.doing.length + board.done.length;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40"
      style={{ fontFamily: FONT_BODY }}
    >
      {/* App top bar */}
      <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
        </div>

        {/* Workspace switcher */}
        <div className="ml-1 flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5">
          {WORKSPACES.map((w) => (
            <button
              key={w.id}
              onClick={() => setWs(w.id)}
              className="relative rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={{ color: ws === w.id ? '#fff' : '#6B7280' }}
            >
              {ws === w.id && (
                <motion.span
                  layoutId="ws-pill"
                  className="absolute inset-0 rounded-md"
                  style={{ background: w.accent }}
                  transition={{ duration: 0.3, ease: E }}
                />
              )}
              <span className="relative">{w.label}</span>
            </button>
          ))}
        </div>

        {/* Search + notifications + presence */}
        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={openCommandPalette}
            className="hidden items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-[10px] text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 sm:flex"
          >
            <Search className="h-3 w-3" /> Cari… <kbd className="rounded bg-neutral-100 px-1 text-[8px]">⌘K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen((o) => !o); setNotifRead(true); }}
              className="relative flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100"
              aria-label="Notifikasi"
            >
              <Bell className="h-4 w-4" />
              {!notifRead && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: '#EF4444' }} />
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setNotifOpen(false)} aria-hidden />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: E }}
                    className="absolute right-0 top-9 z-20 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
                  >
                    <div className="border-b border-neutral-100 px-3 py-2 text-[11px] font-semibold text-neutral-700">Notifikasi</div>
                    <div className="divide-y divide-neutral-50">
                      {NOTIFICATIONS.map((n) => (
                        <div key={n.who + n.what} className="flex items-start gap-2 px-3 py-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: n.color }}>
                            {initials(n.who)}
                          </span>
                          <p className="text-[10px] leading-snug text-neutral-600">
                            <span className="font-semibold text-neutral-800">{n.who}</span> {n.what}
                            <span className="mt-0.5 block text-[9px] text-neutral-400">{n.time} lalu</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden -space-x-1.5 sm:flex">
            {PRESENCE.map((p) => (
              <span
                key={p.name}
                className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold text-white"
                style={{ background: p.color }}
                title={p.name}
              >
                {initials(p.name)}
                <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full border border-white bg-emerald-400" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Board header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-sm font-bold text-neutral-900">{WORKSPACES.find((w) => w.id === ws)!.label}</p>
          <p className="text-[11px] text-neutral-400">{totalCards} tugas aktif · seret kartu untuk mengatur ulang</p>
        </div>
        <button
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
          style={{ background: accent }}
        >
          <Plus className="h-3 w-3" /> Tugas
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-3 gap-2.5 px-4 py-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="min-w-0">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
              <span className="truncate text-[10px] font-semibold text-neutral-500">{col.label}</span>
              <span className="ml-auto text-[10px] text-neutral-300">{board[col.key].length}</span>
            </div>

            <Reorder.Group
              axis="y"
              values={board[col.key]}
              onReorder={(next) => setBoard((b) => ({ ...b, [col.key]: next }))}
              className="space-y-2"
            >
              {board[col.key].map((card) => {
                const isOpen = expanded === card.id;
                const [done, total] = card.checklist;
                return (
                  <Reorder.Item
                    key={card.id}
                    value={card}
                    dragListener={!reduce}
                    whileDrag={{ scale: 1.04, boxShadow: '0 12px 24px -8px rgba(0,0,0,0.25)', cursor: 'grabbing' }}
                    className="group rounded-lg border border-neutral-100 bg-white p-2.5 text-left shadow-sm"
                    style={isOpen ? { boxShadow: `0 0 0 1.5px ${card.assignee.color}` } : undefined}
                  >
                    <button onClick={() => setExpanded(isOpen ? null : card.id)} className="block w-full text-left">
                      <div className="flex items-start gap-1">
                        <p className="flex-1 text-[11px] font-medium leading-snug text-neutral-800">{card.title}</p>
                        <GripVertical className="h-3 w-3 shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full" style={{ width: `${(done / total) * 100}%`, background: card.assignee.color }} />
                        </div>
                        <span className="text-[8px] text-neutral-400">{done}/{total}</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[7px] font-bold text-white" style={{ background: card.assignee.color }}>
                          {initials(card.assignee.name)}
                        </span>
                        <span className="flex items-center gap-0.5 text-[8px] text-neutral-400">
                          <Clock className="h-2.5 w-2.5" /> {card.due}
                        </span>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: E }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-1.5 border-t border-neutral-100 pt-2">
                              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500"><CalendarDays className="h-2.5 w-2.5" /> Tenggat {card.due}</div>
                              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500"><Check className="h-2.5 w-2.5" /> {done} dari {total} sub-tugas</div>
                              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500"><MessageSquare className="h-2.5 w-2.5" /> {card.comments} komentar</div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>
        ))}
      </div>

      {/* Live activity feed */}
      <div className="flex items-center gap-2 border-t border-neutral-100 bg-neutral-50/70 px-4 py-2.5">
        <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
        <div className="relative h-4 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={activityIdx}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: E }}
              className="absolute inset-0 truncate text-[10px] text-neutral-500"
            >
              <span className="font-semibold" style={{ color: current.color }}>{current.who}</span>{' '}{current.what}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default HeroPreview;
