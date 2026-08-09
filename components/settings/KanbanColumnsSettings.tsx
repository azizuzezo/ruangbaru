'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Kanban, Plus, Trash2, ChevronUp, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatusDef } from '@/types';

const COLOR_PRESETS = ['#9CA3AF', '#0EA5E9', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444', '#EC4899', '#106CD8'];

export function KanbanColumnsSettings({ workspaceId, statuses, onChanged }: {
  workspaceId: string;
  statuses: TaskStatusDef[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const addColumn = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const key = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `col_${Date.now()}`;
      const maxPos = statuses.length ? Math.max(...statuses.map((s) => s.position)) : -1;
      const color = COLOR_PRESETS[statuses.length % COLOR_PRESETS.length];
      const { error } = await supabase.from('task_statuses').insert({
        workspace_id: workspaceId, key, name: newName.trim(), color, position: maxPos + 1, is_done: false,
      });
      if (error) throw error;
      toast.success(`Kolom "${newName.trim()}" ditambahkan`);
      setNewName('');
      onChanged();
    } catch (err: any) {
      toast.error(err.message?.includes('duplicate') ? 'Sudah ada kolom dengan nama itu' : (err.message || 'Gagal menambah kolom'));
    } finally {
      setAdding(false);
    }
  };

  const removeColumn = async (col: TaskStatusDef) => {
    setBusyId(col.id);
    try {
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', col.key);
      if (count && count > 0) {
        toast.error(`Pindahkan ${count} tugas dari kolom ini dulu sebelum menghapusnya.`);
        return;
      }
      const { error } = await supabase.from('task_statuses').delete().eq('id', col.id);
      if (error) throw error;
      toast.success('Kolom dihapus');
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus kolom');
    } finally {
      setBusyId(null);
    }
  };

  const toggleDone = async (col: TaskStatusDef) => {
    setBusyId(col.id);
    try {
      const { error } = await supabase.from('task_statuses').update({ is_done: !col.is_done }).eq('id', col.id);
      if (error) throw error;
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setBusyId(null);
    }
  };

  const move = async (col: TaskStatusDef, dir: -1 | 1) => {
    const sorted = [...statuses].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((s) => s.id === col.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    setBusyId(col.id);
    try {
      await Promise.all([
        supabase.from('task_statuses').update({ position: swapWith.position }).eq('id', col.id),
        supabase.from('task_statuses').update({ position: col.position }).eq('id', swapWith.id),
      ]);
      onChanged();
    } catch {
      toast.error('Gagal mengubah urutan');
    } finally {
      setBusyId(null);
    }
  };

  const sorted = [...statuses].sort((a, b) => a.position - b.position);

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <Kanban className="h-4 w-4 text-primary" /> Papan Kanban
        </CardTitle>
        <CardDescription className="text-[11px]">
          Kolom yang muncul di papan Tugas untuk seluruh anggota workspace ini. Tandai satu kolom sebagai &quot;Selesai&quot; agar statistik dashboard menghitungnya dengan benar.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-2">
        {sorted.map((col, i) => (
          <div key={col.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: col.color }} />
            <span className="flex-1 text-sm font-semibold text-foreground truncate">{col.name}</span>
            <button
              type="button"
              onClick={() => toggleDone(col)}
              disabled={busyId === col.id}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors',
                col.is_done ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
              title="Tandai sebagai kolom 'Selesai'"
            >
              <CheckCircle2 className="h-3 w-3" /> Selesai
            </button>
            <div className="flex items-center">
              <button type="button" onClick={() => move(col, -1)} disabled={i === 0 || busyId === col.id} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(col, 1)} disabled={i === sorted.length - 1 || busyId === col.id} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => removeColumn(col)}
              disabled={busyId === col.id}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Hapus kolom"
            >
              {busyId === col.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="cth. Ready for Review"
            className="h-9 text-xs"
            disabled={adding}
            onKeyDown={(e) => e.key === 'Enter' && addColumn()}
          />
          <Button type="button" size="sm" onClick={addColumn} disabled={adding || !newName.trim()} className="gap-1.5 h-9 text-xs shrink-0">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Tambah Kolom
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
