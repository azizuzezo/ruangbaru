'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useUIStore } from '@/lib/stores/ui-store';
import { useState, useEffect, use } from 'react';
import {
  Folder, Calendar, CheckSquare, Layers, Users,
  ArrowLeft, Plus, Loader2, Sparkles, Kanban, ListTodo,
  CalendarDays, History, Play, X, UserPlus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Project, Task, Profile, TaskStatus, ProjectMember } from '@/types';
import Link from 'next/link';
import { cn, getInitials } from '@/lib/utils';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';
import { useT } from '@/lib/i18n/useT';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProjectDetailPageProps {
  params: Promise<{
    workspace: string;
    projectId: string;
  }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const t = useT('projects');
  const tc = useT('common');
  const resolvedParams = use(params);
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const { setTaskDetailOpen } = useUIStore();
  const { statuses, doneKeys } = useTaskStatuses(currentWorkspace?.id);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Project collaborators (project_members) — a subset of workspace members
  // explicitly added to this project, distinct from the full workspace roster.
  const [collaborators, setCollaborators] = useState<ProjectMember[]>([]);
  const [addCollabOpen, setAddCollabOpen] = useState(false);
  const [addingCollabId, setAddingCollabId] = useState<string | null>(null);
  const [removingCollabId, setRemovingCollabId] = useState<string | null>(null);

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

        // 3. Fetch the full workspace roster — used both for isAdmin and as
        // the pool of people who can be added as project collaborators.
        const { data: workspaceMembers } = await supabase
          .from('workspace_members')
          .select('user_id, role, profile:profiles(*)')
          .eq('workspace_id', workspaceId);

        const wm = (workspaceMembers as any[]) || [];
        setMembers(wm.map((m) => m.profile).filter(Boolean) as Profile[]);
        const myRole = wm.find((m) => m.user_id === currentUser?.id)?.role;
        setIsAdmin(myRole === 'admin' || myRole === 'owner');

        // 4. Fetch this project's collaborators.
        const { data: pm } = await supabase
          .from('project_members')
          .select('*, profile:profiles(*)')
          .eq('project_id', resolvedParams.projectId);
        setCollaborators((pm as ProjectMember[]) || []);
      } catch (err: any) {
        console.error('Error loading project details:', err);
        toast.error(t('detailLoadErrorToast'));
      } finally {
        setLoading(false);
      }
    }

    if (resolvedParams.projectId) {
      loadProjectDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.projectId, currentWorkspace]);

  // Persist a Kanban drag (optimistic state already applied inside the board).
  const handleMove = async (taskId: string, status: TaskStatus, position: number) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status, position } : t)));
    const { error } = await supabase
      .from('tasks')
      .update({
        status,
        position,
        completed_at: doneKeys.has(status) ? new Date().toISOString() : null,
      })
      .eq('id', taskId);
    if (error) toast.error(t('detailMoveErrorToast'));
  };

  // Add a workspace member as a project collaborator + notify them.
  const handleAddCollaborator = async (userId: string) => {
    if (!project || !currentWorkspace || !currentUser) return;
    setAddingCollabId(userId);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .insert({ project_id: project.id, user_id: userId, role: 'member' })
        .select('*, profile:profiles(*)')
        .single();
      if (error) throw error;

      setCollaborators((prev) => [...prev, data as ProjectMember]);

      if (userId !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'project_invite',
          title: t('collaboratorNotificationTitle'),
          body: t('collaboratorNotificationBody')
            .replace('{name}', currentUser.full_name || currentUser.email)
            .replace('{project}', project.name),
          link: `/${currentWorkspace.slug}/projects/${project.id}`,
          actor_id: currentUser.id,
          workspace_id: currentWorkspace.id,
        });
      }

      toast.success(t('collaboratorAddedToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setAddingCollabId(null);
    }
  };

  // Remove a project collaborator.
  const handleRemoveCollaborator = async (member: ProjectMember) => {
    setRemovingCollabId(member.id);
    try {
      const { error } = await supabase.from('project_members').delete().eq('id', member.id);
      if (error) throw error;
      setCollaborators((prev) => prev.filter((c) => c.id !== member.id));
      toast.success(t('collaboratorRemovedToast'));
    } catch (err: any) {
      toast.error(tc('errorContactSupport'));
    } finally {
      setRemovingCollabId(null);
    }
  };

  const addableMembers = members.filter((m) => !collaborators.some((c) => c.user_id === m.id));

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
        <h3 className="text-lg font-bold text-foreground">{t('detailNotFoundTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('detailNotFoundDesc')}</p>
        <Link href={`/${activeWsSlug}/projects`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> {t('detailBackButton')}
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
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: project.color || '#106CD8' }} />
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
              <Plus className="h-4 w-4" /> {t('detailAddTaskButton')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Collaborators */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> {t('collaboratorsLabel')}
        </span>
        <div className="flex items-center -space-x-2">
          {collaborators.map((c) => (
            <div key={c.id} className="group relative">
              {removingCollabId === c.id ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={c.profile?.avatar_url || ''} />
                  <AvatarFallback className="text-[9px]">{getInitials(c.profile?.full_name)}</AvatarFallback>
                </Avatar>
              )}
              {isAdmin && removingCollabId !== c.id && (
                <button
                  onClick={() => handleRemoveCollaborator(c)}
                  title={t('collaboratorRemoveTooltip')}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-white group-hover:flex"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {collaborators.length === 0 && (
          <span className="text-[11px] text-muted-foreground/70">{t('collaboratorsEmptyState')}</span>
        )}
        {isAdmin && (
          <button
            onClick={() => setAddCollabOpen(true)}
            title={t('collaboratorAddButton')}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full space-y-4">
        <TabsList className="bg-muted p-1 border">
          <TabsTrigger value="list" className="gap-1.5 text-xs"><ListTodo className="h-3.5 w-3.5" /> {t('detailTabList')}</TabsTrigger>
          <TabsTrigger value="kanban" className="gap-1.5 text-xs"><Kanban className="h-3.5 w-3.5" /> {t('detailTabKanban')}</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" /> {t('detailTabCalendar')}</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5 text-xs"><History className="h-3.5 w-3.5" /> {t('detailTabTimeline')}</TabsTrigger>
        </TabsList>

        {/* 1. List Tab */}
        <TabsContent value="list" className="space-y-4">
          <Card className="border border-border/80">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {tasks.length === 0 ? (
                  <div className="p-12 text-center text-xs text-muted-foreground">
                    {t('detailEmptyTasksList')}
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
                        {(() => {
                          const s = statuses.find((x) => x.key === task.status);
                          return (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                              style={{ background: `${s?.color || '#6B7280'}1A`, color: s?.color || '#6B7280' }}
                            >
                              {s?.name || task.status}
                            </span>
                          );
                        })()}
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
            columns={statuses}
            onTaskClick={(id) => setTaskDetailOpen(true, id)}
            onMove={handleMove}
          />
        </TabsContent>

        {/* 3. Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card className="border border-border/80 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">{t('detailCalendarHeading')}</h3>
            <div className="space-y-3">
              {tasks.filter(task => task.due_date).map((task) => (
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
              {tasks.filter(task => task.due_date).length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">
                  {t('detailCalendarEmpty')}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 4. Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border border-border/80 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6">{t('detailTimelineHeading')}</h3>
            <div className="space-y-6 relative border-l-2 border-border pl-6 ml-3">
              {tasks.map((task) => (
                <div key={task.id} className="relative space-y-1">
                  <span className="absolute -left-[31px] top-0 h-4 w-4 rounded-full border-2 border-primary bg-background flex items-center justify-center text-[8px] font-bold text-primary">
                    ✓
                  </span>
                  <h4 className="text-xs font-bold text-foreground">{task.title}</h4>
                  <p className="text-[10px] text-muted-foreground">
                    {t('detailStatusLabel')} <span className="capitalize">{task.status}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addCollabOpen} onOpenChange={setAddCollabOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> {t('collaboratorDialogTitle')}
            </DialogTitle>
            <DialogDescription>{t('collaboratorDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {addableMembers.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t('collaboratorNoneToAdd')}</p>
            ) : (
              addableMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-muted/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={m.avatar_url || ''} />
                      <AvatarFallback className="text-[9px]">{getInitials(m.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{m.full_name || m.email}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 gap-1 text-[11px]"
                    disabled={addingCollabId === m.id}
                    onClick={() => handleAddCollaborator(m.id)}
                  >
                    {addingCollabId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    {t('collaboratorAddButton')}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
