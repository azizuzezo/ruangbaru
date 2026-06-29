'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/types';

export const BOARD_COLUMNS: { id: TaskStatus; title: string; accent: string }[] = [
  { id: 'backlog', title: 'Backlog', accent: 'bg-neutral-400' },
  { id: 'todo', title: 'Todo', accent: 'bg-sky-500' },
  { id: 'in_progress', title: 'In Progress', accent: 'bg-amber-500' },
  { id: 'in_review', title: 'Review', accent: 'bg-violet-500' },
  { id: 'done', title: 'Done', accent: 'bg-emerald-500' },
];

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-rose-500/10 text-rose-600',
  high: 'bg-orange-500/10 text-orange-600',
  medium: 'bg-amber-500/10 text-amber-600',
  low: 'bg-sky-500/10 text-sky-600',
};

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  /** Persist a move. Parent already applied the optimistic state update. */
  onMove: (taskId: string, status: TaskStatus, position: number) => void;
}

function TaskCard({ task, onClick, dragging }: { task: Task; onClick?: () => void; dragging?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'kanban-card group rounded-xl border border-border bg-card p-3 space-y-2 cursor-pointer',
        dragging && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <h4 className="text-xs font-bold text-foreground leading-snug flex-1">{task.title}</h4>
      </div>
      <div className="flex items-center justify-between gap-2 pl-5">
        <div className="flex items-center gap-1.5">
          {task.priority && task.priority !== 'no_priority' && (
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold uppercase', PRIORITY_STYLES[task.priority])}>
              {task.priority}
            </span>
          )}
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
        {task.assignee?.avatar_url ? (
          <img src={task.assignee.avatar_url} alt="" className="h-5 w-5 rounded-full border border-border object-cover" />
        ) : task.assignee?.full_name ? (
          <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
            {task.assignee.full_name[0].toUpperCase()}
          </span>
        ) : null}
      </div>
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

function Column({ id, title, accent, tasks, onTaskClick }: {
  id: TaskStatus; title: string; accent: string; tasks: Task[]; onTaskClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column', status: id } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-2xl border border-dashed border-border bg-muted/30 p-3 transition-colors min-h-[140px]',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between pb-2.5 mb-1">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', accent)} />
          <span className="text-xs font-bold text-foreground">{title}</span>
        </div>
        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-bold">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 flex-1">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-6 text-[11px] text-muted-foreground/70 select-none">Kosong</div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ tasks, onTaskClick, onMove }: KanbanBoardProps) {
  const [items, setItems] = useState<Task[]>(tasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Keep local board in sync when parent task list changes (load/refetch).
  useEffect(() => setItems(tasks), [tasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [], todo: [], in_progress: [], in_review: [], done: [], cancelled: [],
    };
    items
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .forEach((t) => { (map[t.status] ?? map.backlog).push(t); });
    return map;
  }, [items]);

  const findTask = (id: string) => items.find((t) => t.id === id) ?? null;

  const columnForId = (id: string): TaskStatus | null => {
    if (BOARD_COLUMNS.some((c) => c.id === id)) return id as TaskStatus;
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

    // Move card into the column it's hovering over (status changes live).
    setItems((prev) => prev.map((t) => (t.id === activeId ? { ...t, status: overCol } : t)));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const targetStatus = columnForId(String(over.id));
    if (!targetStatus) return;

    const colTasks = byStatus[targetStatus];
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

    // Fractional position between neighbours so we only write one row.
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {BOARD_COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            accent={col.accent}
            tasks={byStatus[col.id]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;
