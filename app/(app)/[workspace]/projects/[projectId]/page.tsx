'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useState, useEffect, use } from 'react';
import { 
  Folder, Calendar, CheckSquare, Layers, Users, 
  ArrowLeft, Plus, Loader2, Sparkles, Kanban, ListTodo,
  CalendarDays, History, Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Project, Task, Profile, TaskStatus } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';

interface ProjectDetailPageProps {
  params: Promise<{
    workspace: string;
    projectId: string;
  }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const resolvedParams = use(params);
  const { currentWorkspace } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const activeWsSlug = currentWorkspace?.slug || 'dashboard';

  useEffect(() => {
    if (!currentWorkspace) return;
    const workspaceId = currentWorkspace.id;

    async function loadProjectDetails() {
      try {
        setLoading(true);

        // 1. Fetch project info
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .select('*')
          .eq('id', resolvedParams.projectId)
          .single();

        if (projErr) throw projErr;
        setProject(projData as Project);

        // 2. Fetch project tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*, assignee:assignee_id(full_name, avatar_url)')
          .eq('project_id', resolvedParams.projectId)
          .order('position', { ascending: true });

        setTasks((tasksData as Task[]) || []);

        // 3. Fetch project members (mock/default profiles for simplicity or load from workspace)
        const { data: workspaceMembers } = await supabase
          .from('workspace_members')
          .select('profiles(*)')
          .eq('workspace_id', workspaceId);

        const profileData = workspaceMembers?.map((m: any) => m.profiles).filter(Boolean) as Profile[];
        setMembers(profileData || []);
      } catch (err: any) {
        console.error('Error loading project details:', err);
        toast.error('Gagal memuat detail proyek');
      } finally {
        setLoading(false);
      }
    }

    if (resolvedParams.projectId) {
      loadProjectDetails();
    }
  }, [resolvedParams.projectId, currentWorkspace]);

  // Persist a Kanban drag (optimistic state already applied inside the board).
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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-muted/60" />
          <div className="h-8 w-48 rounded bg-muted/60" />
        </div>
        <div className="h-10 w-full rounded bg-muted/30" />
        <div className="h-64 rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center p-12 space-y-4">
        <h3 className="text-lg font-bold text-foreground">Proyek Tidak Ditemukan</h3>
        <p className="text-sm text-muted-foreground">Proyek yang Anda cari tidak ada atau Anda tidak memiliki akses.</p>
        <Link href={`/${activeWsSlug}/projects`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Proyek
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/${activeWsSlug}/projects`}>
            <button className="p-2 hover:bg-accent rounded-lg border border-border transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl bg-card p-1.5 rounded-lg border shrink-0">{project.icon}</span>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground leading-tight tracking-tight sm:text-2xl">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/${activeWsSlug}/tasks`}>
            <Button size="sm" variant="gradient" className="gap-1">
              <Plus className="h-4 w-4" /> Tambah Tugas
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full space-y-4">
        <TabsList className="bg-muted p-1 border">
          <TabsTrigger value="list" className="gap-1.5 text-xs"><ListTodo className="h-3.5 w-3.5" /> Daftar Tugas</TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5 text-xs"><Kanban className="h-3.5 w-3.5" /> Papan Kanban</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" /> Kalender</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 text-xs"><History className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
        </TabsList>

        {/* 1. List Tab */}
        <TabsContent value="list" className="space-y-4">
          <Card className="border border-border/80">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {tasks.length === 0 ? (
                  <div className="p-12 text-center text-xs text-muted-foreground">
                    Belum ada tugas di proyek ini. Klik tombol tambah tugas untuk memulai.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => setTaskDetailOpen(true, task.id)}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold text-foreground truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                          task.status === 'todo' && "bg-sky-500/10 text-sky-600",
                          task.status === 'in_progress' && "bg-amber-500/10 text-amber-600",
                          task.status === 'done' && "bg-emerald-500/10 text-emerald-600",
                        )}>
                          {task.status.replace('_', ' ')}
                        </span>
                        {task.assignee?.avatar_url && (
                          <img 
                            src={task.assignee.avatar_url} 
                            alt={task.assignee.full_name || ''} 
                            className="h-5 w-5 rounded-full border" 
                          />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Kanban Tab */}
        <TabsContent value="kanban" className="space-y-4">
          <KanbanBoard
            tasks={tasks}
            onTaskClick={(id) => setTaskDetailOpen(true, id)}
            onMove={handleMove}
          />
        </TabsContent>

        {/* 3. Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card className="border border-border/80 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Agenda Proyek</h3>
            <div className="space-y-3">
              {tasks.filter(t => t.due_date).map((task) => (
                <div key={task.id} className="flex gap-4 p-3 border border-border rounded-xl items-center bg-card">
                  <span className="text-xs font-bold text-foreground min-w-[80px]">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span 
                    onClick={() => setTaskDetailOpen(true, task.id)}
                    className="text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer truncate flex-1"
                  >
                    {task.title}
                  </span>
                </div>
              ))}
              {tasks.filter(t => t.due_date).length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">
                  Tidak ada tugas dengan tenggat waktu
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 4. Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border border-border/80 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6">Timeline Proyek</h3>
            <div className="space-y-6 relative border-l-2 border-border pl-6 ml-3">
              {tasks.map((task) => (
                <div key={task.id} className="relative space-y-1">
                  <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-primary bg-background flex items-center justify-center text-[8px] font-bold text-primary">
                    ✓
                  </span>
                  <h4 className="text-xs font-bold text-foreground">{task.title}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Status: <span className="capitalize">{task.status}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
