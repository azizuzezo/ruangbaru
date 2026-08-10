'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect } from 'react';
import { Plus, Search, Folder, FolderOpen, Globe, ShieldAlert, Sparkles, Loader2, MoreVertical, Trash, Edit, Archive, ArchiveRestore } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Project } from '@/types';
import Link from 'next/link';
import { useT } from '@/lib/i18n/useT';

export default function ProjectsPage() {
  const t = useT('projects');
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#106CD8');
  const [creating, setCreating] = useState(false);

  const COLOR_OPTIONS = ['#106CD8','#10B29F','#FDB31A','#EF4444','#8B5CF6','#F97316'];


  const supabase = createClient();

  // Load projects
  const loadProjects = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      
      setProjects((data as Project[]) || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [currentWorkspace]);

  // Create Project handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspace || !currentUser) return;
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          workspace_id: currentWorkspace.id,
          name,
          description,
          color,
          status: 'active',
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('createSuccessToast').replace('{name}', name));
      setProjects((prev) => [data as Project, ...prev]);
      setCreateOpen(false);
      setName('');
      setDescription('');
      setColor('#106CD8');
    } catch (err: any) {
      toast.error(err.message || t('createErrorToast'));
    } finally {
      setCreating(false);
    }
  };

  // Archive / unarchive project handler
  const handleArchiveProject = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'archived' ? 'active' : 'archived';
    try {
      const { error } = await supabase.from('projects').update({ status: next }).eq('id', id);
      if (error) throw error;
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status: next as Project['status'] } : p)));
      toast.success(next === 'archived' ? t('archiveSuccessToast') : t('restoreSuccessToast'));
    } catch (err: any) {
      toast.error(err.message || t('updateErrorToast'));
    }
  };

  // Delete project handler
  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(t('deleteSuccessToast'));
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.message || t('deleteErrorToast'));
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (showArchived ? p.status === 'archived' : p.status !== 'archived')
  );
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

  const activeWsSlug = currentWorkspace?.slug || 'dashboard';

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight sm:text-3xl">
            {t('pageTitle')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('pageSubtitle')}
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> {t('newButton')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                {t('createDialogTitle')}
              </DialogTitle>
              <DialogDescription>
                {t('createDialogDesc')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 pt-2">
              {/* Project Name */}
              <Input
                id="name"
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={creating}
                required
                className="h-10"
              />
              {/* Description */}
              <Input
                placeholder={t('descPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={creating}
                className="h-10"
              />
              {/* Color picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{t('colorLabel')}</span>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full border-2 transition-all focus:outline-none"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? c : 'transparent',
                      boxShadow: color === c ? `0 0 0 3px ${c}33` : 'none',
                    }}
                  />
                ))}
              </div>
              {/* Preview */}
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="text-sm font-semibold text-foreground truncate">
                  {name || t('namePreviewFallback')}
                </span>
              </div>
              <Button type="submit" className="w-full h-10 mt-2" disabled={creating || !name.trim()}>
                {creating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('submitLoading')}</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" />{t('submitCreate')}</>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowArchived((v) => !v)}
          className="gap-1.5 text-xs"
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? t('viewActiveButton') : `${t('archiveButton')}${archivedCount ? ` (${archivedCount})` : ''}`}
        </Button>
      </div>

      {/* Projects Grid Container */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={showArchived ? t('emptyArchivedTitle') : t('emptyTitle')}
          description={t('emptyDesc')}
          action={
            !showArchived ? (
              <Button variant="gradient" size="sm" className="gap-1" onClick={() => setCreateOpen(true)} disabled={false}>
                <Plus className="h-4 w-4" /> {t('emptyCreateButton')}
              </Button>
            ) : undefined
          }
          className="max-w-md mx-auto"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="group overflow-hidden border border-border/80 hover:border-primary/40 shadow-sm bg-card/60 backdrop-blur-sm transition-all"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex justify-between items-start">
                  <span className="h-2 w-2 rounded-full mt-1.5" style={{ background: project.color }} />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-opacity text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleArchiveProject(project.id, project.status)}>
                        {project.status === 'archived' ? (
                          <><ArchiveRestore className="h-4 w-4 mr-2" /> {t('restoreMenuItem')}</>
                        ) : (
                          <><Archive className="h-4 w-4 mr-2" /> {t('archiveMenuItem')}</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteProject(project.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <Trash className="h-4 w-4 mr-2" /> {t('deleteMenuItem')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0 flex flex-col justify-between min-h-[96px]">
                <Link href={`/${activeWsSlug}/projects/${project.id}`}>
                  <div className="cursor-pointer space-y-1">
                    <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40 text-[10px] text-muted-foreground font-semibold">
                  <span className="capitalize">{project.status}</span>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
