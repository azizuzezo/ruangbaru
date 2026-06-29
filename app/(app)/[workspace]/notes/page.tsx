'use client';

import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useState, useEffect, useRef } from 'react';
import { RichTextEditor, type RichTextValue } from '@/components/editor/RichTextEditor';
import { 
  FileText, Search, Plus, Trash2, Edit3, Globe,
  BookOpen, Sparkles, Loader2, Save
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Note } from '@/types';
import { Separator } from '@/components/ui/separator';

export default function NotesPage() {
  const { currentWorkspace, currentUser } = useWorkspaceStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor states
  const [editorTitle, setEditorTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // Latest rich-text value lives in a ref so typing doesn't re-render the page;
  // the editor is remounted per-note via `key`, so it stays in sync on select.
  const editorValueRef = useRef<RichTextValue>({ json: null, text: '' });

  const supabase = createClient();

  // Fetch all workspace notes
  const loadNotes = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false });

      const notesList = (data as Note[]) || [];
      setNotes(notesList);
      if (notesList.length > 0) {
        handleSelectNote(notesList[0]);
      } else {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [currentWorkspace]);

  // Select note handler
  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditorTitle(note.title || 'Untitled');
    editorValueRef.current = {
      json: note.content ?? null,
      text: note.content_text || '',
    };
  };

  // Create note handler
  const handleCreateNote = async () => {
    if (!currentWorkspace || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          workspace_id: currentWorkspace.id,
          title: 'Untitled Note',
          content_text: '',
          icon: '📝',
          is_public: false,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Catatan baru dibuat!');
      setNotes((prev) => [data as Note, ...prev]);
      handleSelectNote(data as Note);
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat catatan');
    }
  };

  // Save note details
  const handleSaveNote = async () => {
    if (!selectedNote) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          title: editorTitle,
          content: editorValueRef.current.json,
          content_text: editorValueRef.current.text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedNote.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Catatan disimpan');
      setNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? (data as Note) : n)));
      setSelectedNote(data as Note);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan catatan');
    } finally {
      setSaving(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;

      toast.success('Catatan dihapus');
      const updatedNotes = notes.filter((n) => n.id !== id);
      setNotes(updatedNotes);
      if (selectedNote?.id === id) {
        if (updatedNotes.length > 0) {
          handleSelectNote(updatedNotes[0]);
        } else {
          setSelectedNote(null);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus catatan');
    }
  };

  const filteredNotes = notes.filter((n) =>
    (n.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8.5rem)] flex border border-border/80 rounded-2xl overflow-hidden bg-card/40 backdrop-blur-sm shadow-md">
      {/* 1. Left Side: Documents list */}
      <div className="w-72 border-r border-border flex flex-col bg-background/40">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Catatan Dokumen</span>
            <Button size="icon-sm" variant="outline-brand" onClick={handleCreateNote}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari dokumen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-muted-foreground">
              Tidak ada catatan
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`group flex items-center justify-between p-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{note.icon}</span>
                  <span className="truncate">{note.title || 'Untitled'}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded transition-all text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Right Side: Note Editor */}
      <div className="flex-1 flex flex-col bg-background/20">
        {selectedNote ? (
          <>
            {/* Action Header */}
            <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card/30">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-muted-foreground/60" /> Catatan internal tim Anda
              </span>
              <Button size="sm" onClick={handleSaveNote} disabled={saving} className="gap-1.5 h-8">
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Simpan</span>
              </Button>
            </div>

            {/* Editing canvas */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
              <input
                type="text"
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                placeholder="Judul Catatan..."
                className="w-full bg-transparent border-0 text-2xl font-display font-extrabold tracking-tight focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40"
              />
              <RichTextEditor
                key={selectedNote.id}
                content={selectedNote.content ?? null}
                placeholder="Tulis gagasan, panduan kerja, atau catatan rapat tim Anda di sini..."
                onChange={(value) => { editorValueRef.current = value; }}
                className="min-h-[calc(100%-80px)]"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="font-bold text-foreground text-sm">Pilih Dokumen</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
              Klik catatan di panel kiri untuk membuka editor, atau klik tambah untuk merancang dokumen baru.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
