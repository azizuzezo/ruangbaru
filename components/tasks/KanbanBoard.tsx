'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, ChevronLeft, ChevronRight, GripVertical, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskStatusDef } from '@/types';
import { useT } from '@/lib/i18n/useT';

const PRIORITY_STYLES: Record<string, { dot: string; chip: string }> = {
  urgent: { dot: 'bg-rose-500', chip: 'bg-rose-500/10 text-rose-600' },
  high: { dot: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-600' },
  medium: { dot: 'bg-amber-500', chip: 'bg-amber-500/10 text-amber-600' },
  low: { dot: 'bg-sky-500', chip: 'bg-sky-500/10 text-sky-600' },
};

interface KanbanBoardProps {
  tasks: Task[];
  columns: TaskStatusDef[];
  onTaskClick: (taskId: string) => void;
  onMove: (taskId: string, status: TaskStatus, position: number) => void;
}

function TaskCard({ task, onClick, dragging, overlay }: {
  task: Task; onClick?: () => void; dragging?: boolean; overlay?: boolean;
}) {
  const t = useT('tasks');
  const overdue = task.due_date && new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
  const priority = task.priority && task.priority !== 'no_priority' ? PRIORITY_STYLES[task.priority] : null;

  return (
    <div
      role={overlay ? undefined : 'button'}
      tabIndex={overlay ? undefined : 0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); }
      }}
      className={cn(
        'group relative rounded-xl border border-border bg-card p-3.5 shadow-xs transition-all duration-150',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        dragging && 'opacity-40',
        overlay && '-rotate-1 cursor-grabbing border-primary/40 shadow-xl',
      )}
    >
      {/* Project + priority: the project dot is the only colour marker here. */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: task.project?.color || '#106CD8' }} />
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-muted-foreground">
          {task.project?.name || t('noProject')}
        </span>
        {priority && (
          <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', priority.chip)}>
            <span className={cn('h-1 w-1 rounded-full', priority.dot)} />
            {task.priority}
          </span>
        )}
      </div>

      <h4 className="text-xs font-bold leading-snug text-foreground">{task.title}</h4>

      <div className="mt-3 flex items-center justify-between gap-2">
        {task.due_date ? (
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', overdue ? 'text-rose-600' : 'text-muted-foreground')}>
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
        ) : <span />}

        <div className="flex items-center -space-x-1.5">
          {task.creator && (
            <span
              title={`${t('createdByPrefix')} ${task.creator.full_name || task.creator.email}`}
              className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-muted text-[8px] font-bold text-muted-foreground"
            >
              {(task.creator.full_name || task.creator.email || '?')[0].toUpperCase()}
            </span>
          )}
          {task.assignee?.avatar_url ? (
            <img src={task.assignee.avatar_url} alt="" title={task.assignee.full_name || ''} className="h-5 w-5 rounded-full border-2 border-card object-cover" />
          ) : task.assignee?.full_name ? (
            <span title={task.assignee.full_name} className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[9px] font-bold text-primary">
              {task.assignee.full_name[0].toUpperCase()}
            </span>
          ) : null}
        </div>
      </div>

      <GripVertical className="absolute right-1 top-3 h-3.5 w-3.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

function SortableTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onClick={onClick} dragging={isDragging} />
    </div>
  );
}

function Column({ id, title, color, tasks, onTaskClick }: {
  id: string; title: string; color: string; tasks: Task[]; onTaskClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column', status: id } });
  const t = useT('tasks');
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[264px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-muted/30 transition-colors sm:w-[280px]',
        isOver && 'border-primary/40 bg-primary/5',
      )}
    >
      {/* Column colour is a deliberate repeated motif, not decoration. */}
      <div className="h-1 w-full" style={{ background: color }} />
      <div className="flex items-center justify-between gap-2 px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate text-xs font-bold text-foreground">{title}</span>
        </div>
        <span className="shrink-0 rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 px-2.5 pb-3">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-3 py-8 text-center">
              <Inbox className="h-5 w-5 text-muted-foreground/40" />
              <span className="text-[11px] text-muted-foreground/70">{t('columnEmptyState')}</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ tasks, columns, onTaskClick, onMove }: KanbanBoardProps) {
  const [items, setItems] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  useEffect(() => setItems(tasks), [tasks]);

  // Reflect horizontal overflow so the arrow affordances only appear when useful.
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
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

  const findTask = (id: string) => items.find((t) => t.id === id) ?? null;

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
    const overId = String(over.id);
    const activeCol = columnForId(activeId);
    const overCol = columnForId(overId);
    if (!activeCol || !overCol || activeCol === overCol) return;
    setItems((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: overCol } : t)));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const targetStatus = columnForId(String(over.id));
    if (!targetStatus) return;

    const colTasks = byStatus[targetStatus] || [];
    const oldIndex = colTasks.findIndex((t) => t.id === activeId);
    const overTaskIndex = colTasks.findIndex((t) => t.id === String(over.id));
    const newIndex = overTaskIndex === -1 ? colTasks.length - 1 : overTaskIndex;

    let ordered = colTasks;
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      ordered = arrayMove(colTasks, oldIndex, newIndex);
      setItems((prev) => {
        const others = prev.filter((t) => t.status !== targetStatus);
        return [...others, ...ordered];
      });
    }

    const idx = ordered.findIndex((t) => t.id === activeId);
    const prevPos = idx > 0 ? ordered[idx - 1].position ?? 0 : null;
    const nextPos = idx < ordered.length - 1 ? ordered[idx + 1].position ?? 0 : null;
    let position: number;
    if (prevPos === null && nextPos === null) position = 1000;
    else if (prevPos === null) position = (nextPos as number) - 1;
    else if (nextPos === null) position = prevPos + 1;
    else position = (prevPos + nextPos) / 2;

    setItems((prev) => prev.map((t) => (t.id === activeId ? { ...t, position } : t)));
    onMove(activeId, targetStatus, position);
  }

  const scrollBy = (dir: -1 | 1) => scrollRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-2">
        {/* Scroll affordance — only rendered when the board actually overflows. */}
        {(canScroll.left || canScroll.right) && (
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canScroll.left}
              aria-label="Geser ke kiri"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={!canScroll.right}
              aria-label="Geser ke kanan"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div ref={scrollRef} className="kanban-scroll flex snap-x gap-3 overflow-x-auto pb-3 pt-1">
          {columns.map((col) => (
            <Column
              key={col.key}
              id={col.key}
              title={col.name}
              color={col.color}
              tasks={byStatus[col.key] || []}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask ? <div className="w-[264px]"><TaskCard task={activeTask} overlay /></div> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;
