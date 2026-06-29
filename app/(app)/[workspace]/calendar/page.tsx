'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, CheckSquare, Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, addMonths, subMonths, isToday 
} from 'date-fns';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Load dated tasks in workspace
  useEffect(() => {
    if (!currentWorkspace) return;
    const workspaceId = currentWorkspace.id;
    async function loadCalendarTasks() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('tasks')
          .select('*, project:projects(name, icon)')
          .eq('workspace_id', workspaceId)
          .not('due_date', 'is', null);

        setTasks((data as Task[]) || []);
      } catch (err) {
        console.error('Error loading calendar tasks:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCalendarTasks();
  }, [currentWorkspace]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            Kalender Rencana Kerja
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Lihat agenda tenggat waktu tugas tim dalam sebulan secara visual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold text-foreground min-w-[120px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Month Grid */}
      {loading ? (
        <div className="h-[400px] border border-border rounded-2xl flex items-center justify-center bg-card/60 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border border-border/80 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {/* Days of week titles */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Days grid slots */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border min-h-[420px] bg-background/20">
              {days.map((day, idx) => {
                const dayTasks = tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day));
                const isCurrentMonthDay = isSameMonth(day, currentDate);
                const isTodayDay = isToday(day);

                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-2 flex flex-col gap-1.5 min-h-[90px] transition-colors relative overflow-hidden",
                      !isCurrentMonthDay && "bg-muted/10 opacity-40",
                      isTodayDay && "bg-primary/5 border-t-2 border-t-primary"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold self-end rounded-full h-5 w-5 flex items-center justify-center",
                      isTodayDay ? "bg-primary text-primary-foreground font-black" : "text-muted-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>

                    {/* Task events inside current slot */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[60px] scrollbar-none pr-1">
                      {dayTasks.map((task) => (
                        <div 
                          key={task.id}
                          onClick={() => setTaskDetailOpen(true, task.id)}
                          className="text-[9px] font-bold p-1 bg-primary/10 text-primary border border-primary/20 rounded cursor-pointer truncate hover:bg-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                          title={task.title}
                        >
                          {task.project?.icon} {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
