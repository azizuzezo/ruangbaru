import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isYesterday, isTomorrow } from 'date-fns';
import type { TaskStatus, TaskPriority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatters
export function formatDate(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, "'Today at' h:mm a");
  if (isYesterday(d)) return format(d, "'Yesterday at' h:mm a");
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelativeTime(date: string | Date | null): string {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// File size formatter
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

// Status helpers
export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  backlog: { label: 'Backlog', color: 'text-neutral-500', bgColor: 'bg-neutral-500/10', icon: '○' },
  todo: { label: 'Todo', color: 'text-sky-500', bgColor: 'bg-sky-500/10', icon: '◎' },
  in_progress: { label: 'In Progress', color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: '◑' },
  in_review: { label: 'In Review', color: 'text-violet-500', bgColor: 'bg-violet-500/10', icon: '◐' },
  done: { label: 'Done', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: '●' },
  cancelled: { label: 'Cancelled', color: 'text-rose-500', bgColor: 'bg-rose-500/10', icon: '⊘' },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  urgent: { label: 'Urgent', color: 'text-rose-500', icon: '🔴' },
  high: { label: 'High', color: 'text-orange-500', icon: '🟠' },
  medium: { label: 'Medium', color: 'text-amber-500', icon: '🟡' },
  low: { label: 'Low', color: 'text-sky-500', icon: '🔵' },
  no_priority: { label: 'No Priority', color: 'text-muted-foreground', icon: '⚪' },
};

// Generate initials from name
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Generate a color from string (for avatars)
export function stringToColor(str: string): string {
  const colors = [
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-orange-500',
    'bg-rose-500', 'bg-pink-500', 'bg-purple-500', 'bg-fuchsia-500',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Truncate text
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

// Slugify
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Calculate task completion percentage
export function getCompletionPercentage(total: number, completed: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Sort tasks by position
export function sortByPosition<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

// Check if a date is overdue
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && !isToday(new Date(dueDate));
}

// Debounce
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
