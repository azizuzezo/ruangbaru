'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, Reorder, useReducedMotion } from 'framer-motion';
import {
  Check, Clock, CalendarDays, MessageSquare, Plus, Search, Bell, GripVertical,
} from 'lucide-react';
import { openCommandPalette } from '@/components/landing/CommandPalette';
import { useT } from '@/lib/i18n/useT';

const BLUE = '#106CD8';
const TEAL = '#10B29F';
const YELLOW = '#FDB31A';
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];

// `title` and `due` below hold translation keys (resolved with t() at render
// time), not display text, so this demo data updates with the locale.
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
  { id: 'produk', label: 'hpWsProduk', accent: BLUE },
  { id: 'marketing', label: 'hpWsMarketing', accent: TEAL },
  { id: 'operasional', label: 'hpWsOperasional', accent: YELLOW },
] as const;

const BOARDS: Record<string, Card[]> = {
  produk: [
    { id: 'p1', title: 'hpCardTitleP1', col: 'doing', assignee: { name: 'Putri', color: BLUE }, due: 'hpDue2Days', checklist: [3, 5], comments: 4 },
    { id: 'p2', title: 'hpCardTitleP2', col: 'todo', assignee: { name: 'Adi', color: TEAL }, due: 'hpDueThisWeek', checklist: [0, 3], comments: 1 },
    { id: 'p3', title: 'hpCardTitleP3', col: 'todo', assignee: { name: 'Rani', color: YELLOW }, due: 'hpDue5Days', checklist: [1, 4], comments: 2 },
    { id: 'p4', title: 'hpCardTitleP4', col: 'done', assignee: { name: 'Budi', color: '#8B5CF6' }, due: 'hpDueDone', checklist: [6, 6], comments: 8 },
  ],
  marketing: [
    { id: 'm1', title: 'hpCardTitleM1', col: 'doing', assignee: { name: 'Sari', color: TEAL }, due: 'hpDue3Days', checklist: [2, 6], comments: 5 },
    { id: 'm2', title: 'hpCardTitleM2', col: 'todo', assignee: { name: 'Dewi', color: BLUE }, due: 'hpDueTomorrow', checklist: [4, 8], comments: 3 },
    { id: 'm3', title: 'hpCardTitleM3', col: 'done', assignee: { name: 'Tono', color: YELLOW }, due: 'hpDueDone', checklist: [5, 5], comments: 2 },
  ],
  operasional: [
    { id: 'o1', title: 'hpCardTitleO1', col: 'todo', assignee: { name: 'Joko', color: YELLOW }, due: 'hpDueThisWeek', checklist: [1, 4], comments: 1 },
    { id: 'o2', title: 'hpCardTitleO2', col: 'doing', assignee: { name: 'Mira', color: BLUE }, due: 'hpDue4Days', checklist: [3, 7], comments: 6 },
    { id: 'o3', title: 'hpCardTitleO3', col: 'done', assignee: { name: 'Hadi', color: TEAL }, due: 'hpDueDone', checklist: [9, 9], comments: 4 },
  ],
};

const COLUMNS: { key: ColKey; label: string; dot: string }[] = [
  { key: 'todo', label: 'hpColTodo', dot: '#9CA3AF' },
  { key: 'doing', label: 'hpColDoing', dot: BLUE },
  { key: 'done', label: 'hpColDone', dot: TEAL },
];

const ACTIVITY = [
  { who: 'Putri', whatKey: 'hpActivityWhat1', color: BLUE },
  { who: 'Adi', whatKey: 'hpActivityWhat2', color: TEAL },
  { who: 'Rani', whatKey: 'hpActivityWhat3', color: YELLOW },
  { who: 'Budi', whatKey: 'hpActivityWhat4', color: '#8B5CF6' },
];

const PRESENCE = [
  { name: 'Putri', color: BLUE },
  { name: 'Adi', color: TEAL },
  { name: 'Rani', color: YELLOW },
  { name: 'Budi', color: '#8B5CF6' },
];

const NOTIFICATIONS = [
  { who: 'Adi', whatKey: 'hpNotifWhat1', timeKey: 'hpNotifTime1', color: TEAL },
  { who: 'Putri', whatKey: 'hpNotifWhat2', timeKey: 'hpNotifTime2', color: BLUE },
  { who: 'Rani', whatKey: 'hpNotifWhat3', timeKey: 'hpNotifTime3', color: YELLOW },
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
  const t = useT('landing');
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
    <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40">
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
              <span className="relative">{t(w.label)}</span>
            </button>
          ))}
        </div>

        {/* Search + notifications + presence */}
        <div className="ml-auto flex items-center gap-2.5">
          <button
            onClick={openCommandPalette}
            className="hidden items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-[10px] text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 sm:flex"
          >
            <Search className="h-3 w-3" /> {t('hpSearchLabel')} <kbd className="rounded bg-neutral-100 px-1 text-[8px]">⌘K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen((o) => !o); setNotifRead(true); }}
              className="relative flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100"
              aria-label={t('hpNotifLabel')}
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
                    <div className="border-b border-neutral-100 px-3 py-2 text-[11px] font-semibold text-neutral-700">{t('hpNotifLabel')}</div>
                    <div className="divide-y divide-neutral-50">
                      {NOTIFICATIONS.map((n) => (
                        <div key={n.who + n.whatKey} className="flex items-start gap-2 px-3 py-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: n.color }}>
                            {initials(n.who)}
                          </span>
                          <p className="text-[10px] leading-snug text-neutral-600">
                            <span className="font-semibold text-neutral-800">{n.who}</span> {t(n.whatKey)}
                            <span className="mt-0.5 block text-[9px] text-neutral-400">{t(n.timeKey)} {t('hpTimeAgoSuffix')}</span>
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
          <p className="text-sm font-bold text-neutral-900">{t(WORKSPACES.find((w) => w.id === ws)!.label)}</p>
          <p className="text-[11px] text-neutral-400">{totalCards}{t('hpActiveTasksSuffix')}</p>
        </div>
        <button
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm"
          style={{ background: accent }}
        >
          <Plus className="h-3 w-3" /> {t('hpAddTaskButton')}
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-3 gap-2.5 px-4 py-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="min-w-0">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
              <span className="truncate text-[10px] font-semibold text-neutral-500">{t(col.label)}</span>
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
                        <p className="flex-1 text-[11px] font-medium leading-snug text-neutral-800">{t(card.title)}</p>
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
                          <Clock className="h-2.5 w-2.5" /> {t(card.due)}
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
                              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500"><CalendarDays className="h-2.5 w-2.5" /> {t('hpDueLabelPrefix')}{t(card.due)}</div>
                              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500"><Check className="h-2.5 w-2.5" /> {t('hpChecklistLabel').replace('{done}', String(done)).replace('{total}', String(total))}</div>
                              <div className="flex items-center gap-1.5 text-[9px] text-neutral-500"><MessageSquare className="h-2.5 w-2.5" /> {t('hpCommentsLabel').replace('{count}', String(card.comments))}</div>
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
              <span className="font-semibold" style={{ color: current.color }}>{current.who}</span>{' '}{t(current.whatKey)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default HeroPreview;
