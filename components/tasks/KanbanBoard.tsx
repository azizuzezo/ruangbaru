'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable,
  closestCorners, defaultDropAnimationSideEffects,
  type DragStartEvent, type DragEndEvent, type DragOverEvent, type DropAnimation,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Flag, Plus, Check } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { FlowBar } from '@/components/tasks/FlowBar';
import { dueInfo, dueLabel, DUE_TONE, priorityMeta } from '@/lib/tasks/meta';
import { useLocale } from '@/lib/i18n/locale-context';
import type { Task, TaskStatus, TaskStatusDef } from '@/types';
import { useT } from '@/lib/i18n/useT';

interface KanbanBoardProps {
  tasks: Task[];
  columns: TaskStatusDef[];
  onTaskClick: (taskId: string) => void;
  /** Persist a move. Return a promise so the card can show it is saving. */
  onMove: (taskId: string, status: TaskStatus, position: number) => void | Promise<void>;
  /** Open the create form preset to a column. */
  onAdd?: (status: TaskStatus) => void;
  /** Column to bring into view on first render (e.g. from the dashboard's flow bar). */
  focusColumn?: string | null;
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const dropAnimation: DropAnimation = {
  duration: 240,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0' } } }),
};

function Avatarish({ name, url, title, tone }: { name?: string | null; url?: string | null; title: string; tone: 'primary' | 'muted' }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" title={title} className="size-6 rounded-full border-2 border-card object-cover" />;
  }
  return (
    <span
      title={title}
      className={cn(
        'flex size-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-semibold',
        tone === 'primary' ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/**
 * Card hierarchy: title first (it is what people scan for), then one meta
 * row. Colour only where it carries meaning: the project dot, the due chip
 * when time matters, the priority flag.
 */
function TaskCard({ task, done, saving, onClick, overlay }: {
  task: Task; done?: boolean; saving?: boolean; onClick?: () => void; overlay?: boolean;
}) {
  const t = useT('tasks');
  const { locale } = useLocale();
  const prio = priorityMeta(task.priority);
  const due = done ? null : dueInfo(task.due_date);

  return (
    <div
      role={overlay ? undefined : 'button'}
      tabIndex={overlay ? undefined : 0}
      aria-label={overlay ? undefined : task.title}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); }
      }}
      className={cn(
        'group relative cursor-pointer select-none rounded-2xl border border-border bg-card p-3.5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[transform,box-shadow,border-color] duration-200',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_24px_-12px_rgb(15_23_42/0.28)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        overlay && 'rotate-[2deg] scale-[1.03] cursor-grabbing border-primary/40 shadow-[0_24px_48px_-16px_rgb(15_23_42/0.45)]',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full" style={{ background: task.project?.color || 'var(--primary)' }} />
          <span className="truncate">{task.project?.name || t('noProject')}</span>
        </span>
        {saving ? (
          <Spinner className="size-3.5 text-primary" label={t('savingMove')} />
        ) : prio ? (
          <span className={cn('inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold', prio.text)}>
            <Flag className="size-3 fill-current" />
            <span className={cn(prio.rank > 1 && 'sr-only')}>{t(prio.labelKey)}</span>
          </span>
        ) : null}
      </div>

      <p className={cn('mt-2 line-clamp-3 text-[13.5px] font-semibold leading-snug text-foreground', done && 'text-muted-foreground line-through decoration-muted-foreground/50')}>
        {task.title}
      </p>

      {(due || done || task.assignee || task.creator) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {done ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <Check className="size-3" strokeWidth={3} /> {t('doneLabel')}
            </span>
          ) : due ? (
            <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', DUE_TONE[due.kind])}>
              <Clock className="size-3" /> {dueLabel(due, t, locale === 'en' ? 'en-US' : 'id-ID')}
            </span>
          ) : <span />}

          <span className="flex items-center -space-x-1.5">
            {task.creator && task.creator.id !== task.assignee_id && (
              <Avatarish name={task.creator.full_name || task.creator.email} url={null} tone="muted" title={`${t('createdByPrefix')} ${task.creator.full_name || task.creator.email}`} />
            )}
            {task.assignee && (
              <Avatarish name={task.assignee.full_name} url={task.assignee.avatar_url} tone="primary" title={task.assignee.full_name || ''} />
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function SortableTaskCard({ task, done, saving, onClick }: { task: Task; done: boolean; saving: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });
  // dnd-kit makes the wrapper a focusable role="button"; the card inside is
  // already the keyboard target, so drop those to avoid a second, dead tab stop.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { role: _role, tabIndex: _tabIndex, ...dragAttributes } = attributes;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 [&>*]:invisible')}
      {...dragAttributes}
      {...listeners}
    >
      <TaskCard task={task} done={done} saving={saving} onClick={onClick} />
    </div>
  );
}

function Column({ col, tasks, saving, onTaskClick, onAdd, index }: {
  col: TaskStatusDef; tasks: Task[]; saving: Set<string>; onTaskClick: (id: string) => void; onAdd?: (status: string) => void; index: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key, data: { type: 'column', status: col.key } });
  const t = useT('tasks');
  const reduce = useReducedMotion();

  return (
    <motion.section
      id={`kanban-col-${col.key}`}
      aria-label={`${col.name}, ${tasks.length}`}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: EASE }}
      className="flex w-[min(300px,82vw)] shrink-0 snap-start flex-col rounded-3xl border border-border bg-muted/40 transition-[box-shadow,background-color] duration-200"
      style={{
        // Each column carries its own admin-chosen colour as a soft wash at
        // the top: it identifies the column without a decorative stripe.
        backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${col.color} 13%, transparent), transparent 120px)`,
        boxShadow: isOver ? `0 0 0 2px ${col.color}` : undefined,
      }}
    >
      <header className="flex items-center gap-2 px-4 pb-2 pt-4">
        <span className="size-2.5 shrink-0 rounded-[4px]" style={{ background: col.color }} />
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{col.name}</h3>
        <span
          className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground"
          style={{ background: `color-mix(in srgb, ${col.color} 18%, transparent)` }}
        >
          {tasks.length}
        </span>
        {onAdd && (
          <button
            type="button"
            onClick={() => onAdd(col.key)}
            aria-label={t('addToColumn').replace('{column}', col.name)}
            title={t('addToColumn').replace('{column}', col.name)}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
          </button>
        )}
      </header>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="kanban-col-scroll flex min-h-[160px] flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pb-3 pt-1 lg:max-h-[calc(100dvh-340px)]"
        >
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              done={col.is_done}
              saving={saving.has(task.id)}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <button
              type="button"
              onClick={onAdd ? () => onAdd(col.key) : undefined}
              disabled={!onAdd}
              className={cn(
                'flex h-32 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 text-center text-xs text-muted-foreground transition-colors',
                isOver ? 'border-transparent' : 'border-border hover:border-primary/40 hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
              )}
            >
              {onAdd && <Plus className="size-4" />}
              {t('columnDropHere')}
            </button>
          )}
        </div>
      </SortableContext>
    </motion.section>
  );
}

export function KanbanBoard({ tasks, columns, onTaskClick, onMove, onAdd, focusColumn }: KanbanBoardProps) {
  const t = useT('tasks');
  const [items, setItems] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  useEffect(() => setItems(tasks), [tasks]);

  // Reflect horizontal overflow so the fade + arrows only appear when useful.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setCanScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [columns.length]);

  const scrollToColumn = (key: string) => {
    const el = document.getElementById(`kanban-col-${key}`);
    const box = scrollRef.current;
    if (!el || !box) return;
    box.scrollTo({ left: el.offsetLeft - box.offsetLeft - 8, behavior: 'smooth' });
    el.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out', delay: 250 });
  };

  useEffect(() => {
    if (focusColumn) { const id = window.setTimeout(() => scrollToColumn(focusColumn), 350); return () => window.clearTimeout(id); }
  }, [focusColumn, columns.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch: a short press starts a drag so a normal swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
  );
  const fallbackKey = columns[0]?.key ?? 'backlog';

  const byStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    columns.forEach((c) => { map[c.key] = []; });
    items
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .forEach((task) => {
        (map[task.status] ?? (map[fallbackKey] ??= [])).push(task);
      });
    return map;
  }, [items, columns, fallbackKey]);

  const findTask = (id: string) => items.find((x) => x.id === id) ?? null;
  const columnForId = (id: string): string | null => {
    if (columns.some((c) => c.key === id)) return id;
    return findTask(id)?.status ?? null;
  };

  function handleDragStart(e: DragStartEvent) {
    setActiveTask(findTask(String(e.active.id)));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const activeCol = columnForId(activeId);
    const overCol = columnForId(String(over.id));
    if (!activeCol || !overCol || activeCol === overCol) return;
    setItems((prev) => prev.map((x) => (x.id === activeId ? { ...x, status: overCol } : x)));
  }

  function handleDragEnd(e: DragEndEvent) {
    const origin = activeTask;
    setActiveTask(null);
    const { active, over } = e;
    if (!over) { setItems(tasks); return; }
    const activeId = String(active.id);
    const targetStatus = columnForId(String(over.id));
    if (!targetStatus) return;

    const colTasks = byStatus[targetStatus] || [];
    const oldIndex = colTasks.findIndex((x) => x.id === activeId);
    const overTaskIndex = colTasks.findIndex((x) => x.id === String(over.id));
    const newIndex = overTaskIndex === -1 ? colTasks.length - 1 : overTaskIndex;

    let ordered = colTasks;
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      ordered = arrayMove(colTasks, oldIndex, newIndex);
      setItems((prev) => [...prev.filter((x) => x.status !== targetStatus), ...ordered]);
    } else if (origin && origin.status === targetStatus && oldIndex === newIndex) {
      return; // dropped where it started: nothing to save
    }

    const idx = ordered.findIndex((x) => x.id === activeId);
    const prevPos = idx > 0 ? ordered[idx - 1].position ?? 0 : null;
    const nextPos = idx < ordered.length - 1 ? ordered[idx + 1].position ?? 0 : null;
    let position: number;
    if (prevPos === null && nextPos === null) position = 1000;
    else if (prevPos === null) position = (nextPos as number) - 1;
    else if (nextPos === null) position = prevPos + 1;
    else position = (prevPos + nextPos) / 2;

    setItems((prev) => prev.map((x) => (x.id === activeId ? { ...x, position } : x)));
    setSaving((s) => new Set(s).add(activeId));
    Promise.resolve(onMove(activeId, targetStatus, position)).finally(() => {
      setSaving((s) => { const n = new Set(s); n.delete(activeId); return n; });
    });
  }

  const scrollBy = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  const flow = columns.map((c) => ({ key: c.key, name: c.name, color: c.color, count: (byStatus[c.key] || []).length }));
  const activeDone = activeTask ? columns.find((c) => c.key === activeTask.status)?.is_done : false;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveTask(null); setItems(tasks); }}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6 sm:px-5">
          <p className="shrink-0 text-xs font-semibold text-foreground">{t('flowTitle')}</p>
          <FlowBar segments={flow} onSelect={scrollToColumn} className="min-w-0 flex-1 [&_ul]:mt-2" />
          <div className="hidden shrink-0 gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScroll.left}
              aria-label={t('scrollLeft')}
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScroll.right}
              aria-label={t('scrollRight')}
              className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={cn(
            'kanban-scroll -mx-1 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-1 pb-3 pt-1 sm:snap-proximity',
            canScroll.left && canScroll.right ? 'board-fade-both' : canScroll.right ? 'board-fade-right' : canScroll.left ? 'board-fade-left' : '',
          )}
        >
          {columns.map((col, i) => (
            <Column
              key={col.key}
              col={col}
              index={i}
              tasks={byStatus[col.key] || []}
              saving={saving}
              onTaskClick={onTaskClick}
              onAdd={onAdd}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? <div className="w-[min(276px,76vw)]"><TaskCard task={activeTask} done={!!activeDone} overlay /></div> : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Board-shaped placeholder: columns and cards in the same rhythm as the real board. */
export function KanbanSkeleton() {
  const t = useT('tasks');
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center gap-3 rounded-3xl border border-border bg-card px-5 py-4 text-xs font-semibold text-primary">
        <Spinner className="size-4" label={t('boardLoading')} />
        <span aria-hidden="true">{t('boardLoading')}</span>
        <span className="ml-2 h-2.5 flex-1 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[3, 2, 4, 1].map((n, i) => (
          <div key={i} className="w-[min(300px,82vw)] shrink-0 space-y-2.5 rounded-3xl border border-border bg-muted/40 p-3" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2 px-1.5 py-1.5">
              <span className="size-2.5 animate-pulse rounded-[4px] bg-muted-foreground/30" />
              <span className="h-3 w-20 animate-pulse rounded-full bg-muted-foreground/20" />
            </div>
            {Array.from({ length: n }).map((_, j) => (
              <div key={j} className="space-y-2.5 rounded-2xl border border-border bg-card p-3.5">
                <span className="block h-2.5 w-24 animate-pulse rounded-full bg-muted" />
                <span className="block h-3.5 w-11/12 animate-pulse rounded-full bg-muted" />
                <span className="block h-3.5 w-2/3 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default KanbanBoard;
