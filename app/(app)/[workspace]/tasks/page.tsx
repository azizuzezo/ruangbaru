'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useState, useEffect } from 'react';
import { 
  CheckSquare, Search, Plus, Filter, LayoutGrid, 
  ListTodo, Loader2, ArrowUpDown, ChevronRight, Calendar
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Task, Project, TaskStatus, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function TasksPage() {
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'board'>('list');
  
  // Create task modal form state
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [priority, setPriority] = useState<TaskPriority>('no_priority');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const supabase = createClient();

  // Load tasks, projects and members
  const loadTasksAndProjects = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);

      // Fetch projects for reference
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);
      
      setProjects((projData as Project[]) || []);
      if (projData && projData.length > 0) {
        setProjectId(projData[0].id);
      }

      // Fetch workspace members
      const { data: memData } = await supabase
        .from('workspace_members')
        .select('user_id, profile:profiles(id, full_name, avatar_url, email)')
        .eq('workspace_id', currentWorkspace.id);
      
      setMembers(memData || []);

      // Fetch workspace tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, assignee:assignee_id(full_name, avatar_url), project:projects(name, icon)')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      setTasks((tasksData as Task[]) || []);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksAndProjects();
  }, [currentWorkspace]);

  // Create Task handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId || !currentWorkspace || !currentUser) return;
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: currentWorkspace.id,
          project_id: projectId,
          title: title.trim(),
          status,
          priority,
          due_date: dueDate || null,
          assignee_id: assigneeId || null,
          created_by: currentUser.id,
          description: description.trim() ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: description.trim() }] }] } : null,
          description_text: description.trim() || null,
        })
        .select('*, assignee:assignee_id(full_name, avatar_url), project:projects(name, icon)')
        .single();

      if (error) throw error;

      // Send notification to assignee if assigned to someone else
      if (assigneeId && assigneeId !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: assigneeId,
          type: 'task_assigned',
          title: 'Tugas Baru Ditugaskan',
          body: `"${title}" telah ditugaskan kepada Anda oleh ${currentUser.full_name || currentUser.email}`,
          link: `/${currentWorkspace.slug}/tasks`,
          actor_id: currentUser.id,
          workspace_id: currentWorkspace.id,
        });
      }

      toast.success('Tugas baru berhasil dibuat!');
      setTasks((prev) => [data as Task, ...prev]);
      setCreateOpen(false);
      setTitle('');
      setDueDate('');
      setStatus('backlog');
      setPriority('no_priority');
      setAssigneeId('');
      setDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat tugas');
    } finally {
      setCreating(false);
    }
  };

  // Persist a Kanban drag from the board view.
  const handleMove = async (taskId: string, status: TaskStatus, position: number) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status, position } : t)));
    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        position,
        completed_at: status === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', taskId);
    if (error) toast.error('Gagal memindahkan tugas');
  };

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            Tugas Tim & Anggota
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Lihat seluruh tugas terbuka Anda di seluruh proyek workspace saat ini.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm" className="gap-1" disabled={projects.length === 0}>
              <Plus className="h-4 w-4" /> Tugas Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Buat Tugas Baru
              </DialogTitle>
              <DialogDescription>
                Beri judul tugas dan tentukan proyek terkait untuk memulai pelacakan.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Input
                  placeholder="Judul tugas..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={creating}
                  required
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Proyek</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-neutral-850 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Tenggat Waktu</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    disabled={creating}
                    className="h-10 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-neutral-850 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-neutral-850 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="no_priority">No Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Assignee Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Penerima Tugas</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-xs font-semibold text-neutral-850 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Pilih Anggota Tim (opsional)</option>
                  {members.filter(m => m.profile).map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Deskripsi Tugas</label>
                <textarea
                  placeholder="Tambahkan detail tugas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={creating}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-neutral-850 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Button type="submit" className="w-full h-10 mt-2 text-xs font-bold" style={{ background: '#106CD8' }} disabled={creating || !title.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Tugas
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter, Search & View toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari tugas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setView('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
              view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListTodo className="h-3.5 w-3.5" /> Daftar
          </button>
          <button
            onClick={() => setView('board')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
              view === 'board' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Papan
          </button>
        </div>
      </div>

      {/* Tasks listing list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : view === 'board' ? (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskClick={(id) => setTaskDetailOpen(true, id)}
          onMove={handleMove}
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Belum ada tugas"
          description="Tidak ada tugas yang cocok. Buat tugas baru untuk mulai melacak pekerjaan tim Anda."
          action={
            <Button variant="gradient" size="sm" className="gap-1" onClick={() => setCreateOpen(true)} disabled={projects.length === 0}>
              <Plus className="h-4 w-4" /> Tugas Baru
            </Button>
          }
          className="max-w-md mx-auto"
        />
      ) : (
        <Card className="border border-border/80">
          <CardContent className="p-0 divide-y divide-border">
            {filteredTasks.map((task) => (
              <div 
                key={task.id}
                onClick={() => setTaskDetailOpen(true, task.id)}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base text-muted-foreground shrink-0">
                    {task.project?.icon || '📁'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 font-medium">
                      <span>{task.project?.name}</span>
                      {task.due_date && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                    task.status === 'todo' && "bg-sky-500/10 text-sky-600",
                    task.status === 'in_progress' && "bg-amber-500/10 text-amber-600",
                    task.status === 'done' && "bg-emerald-500/10 text-emerald-600",
                  )}>
                    {task.status}
                  </span>

                  {task.assignee?.avatar_url && (
                    <img 
                      src={task.assignee.avatar_url} 
                      alt={task.assignee.full_name || ''} 
                      className="h-5 w-5 rounded-full border shrink-0 object-cover" 
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
