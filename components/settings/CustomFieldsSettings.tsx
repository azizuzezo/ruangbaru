'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SlidersHorizontal, Plus, Trash2, Loader2 } from 'lucide-react';
import type { TaskCustomFieldDef, TaskFieldType } from '@/types';

const TYPE_LABELS: Record<TaskFieldType, string> = {
  text: 'Teks', number: 'Angka', date: 'Tanggal', select: 'Pilihan',
};

export function CustomFieldsSettings({ workspaceId, fields, onChanged }: {
  workspaceId: string;
  fields: TaskCustomFieldDef[];
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<TaskFieldType>('text');
  const [options, setOptions] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const addField = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const opts = type === 'select'
        ? options.split(',').map((o) => o.trim()).filter(Boolean)
        : [];
      if (type === 'select' && opts.length === 0) {
        toast.error('Isi minimal satu pilihan, dipisah koma');
        return;
      }
      const maxPos = fields.length ? Math.max(...fields.map((f) => f.position)) : -1;
      const { error } = await supabase.from('task_custom_fields').insert({
        workspace_id: workspaceId, name: name.trim(), field_type: type, options: opts, position: maxPos + 1,
      });
      if (error) throw error;
      toast.success(`Field "${name.trim()}" ditambahkan`);
      setName(''); setOptions(''); setType('text');
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambah field');
    } finally {
      setAdding(false);
    }
  };

  const removeField = async (f: TaskCustomFieldDef) => {
    setBusyId(f.id);
    try {
      const { error } = await supabase.from('task_custom_fields').delete().eq('id', f.id);
      if (error) throw error;
      toast.success('Field dihapus');
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus field');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" /> Field Kustom Tugas
        </CardTitle>
        <CardDescription className="text-[11px]">
          Field tambahan yang muncul saat membuat atau membuka tugas — berlaku untuk semua proyek di workspace ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-2">
        {fields.map((f) => (
          <div key={f.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <span className="flex-1 text-sm font-semibold text-foreground truncate">{f.name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{TYPE_LABELS[f.field_type]}</span>
            {f.field_type === 'select' && (
              <span className="hidden sm:inline text-[10px] text-muted-foreground truncate max-w-[160px]">{f.options.join(', ')}</span>
            )}
            <button
              type="button"
              onClick={() => removeField(f)}
              disabled={busyId === f.id}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Hapus field"
            >
              {busyId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}

        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Estimasi Biaya"
              className="h-9 text-xs"
              disabled={adding}
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskFieldType)}
              disabled={adding}
              className="h-9 shrink-0 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {(Object.keys(TYPE_LABELS) as TaskFieldType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {type === 'select' && (
            <Input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Pilihan, dipisah koma — cth. Rendah, Sedang, Tinggi"
              className="h-9 text-xs"
              disabled={adding}
            />
          )}
          <Button type="button" size="sm" onClick={addField} disabled={adding || !name.trim()} className="gap-1.5 h-9 text-xs w-full">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Tambah Field
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
