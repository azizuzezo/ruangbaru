'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, ListChecks,
  Quote, Link2, Minus, Undo2, Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RichTextValue {
  json: Record<string, unknown> | null;
  text: string;
}

interface RichTextEditorProps {
  content?: Record<string, unknown> | null;
  placeholder?: string;
  editable?: boolean;
  showToolbar?: boolean;
  className?: string;
  /** Fires on every change with both Tiptap JSON and plaintext. */
  onChange?: (value: RichTextValue) => void;
  /** Submit on Cmd/Ctrl+Enter — handy for comment composers. */
  onSubmit?: () => void;
}

function ToolbarButton({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:pointer-events-none',
        active && 'bg-primary/10 text-primary',
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Masukkan URL tautan', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5 sticky top-0 bg-card/80 backdrop-blur-sm z-10 rounded-t-xl">
      <ToolbarButton title="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="h-4 w-4" /></ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Checklist" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}><Link2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="h-4 w-4" /></ToolbarButton>

      <div className="mx-1 h-5 w-px bg-border" />

      <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolbarButton>
    </div>
  );
}

export function RichTextEditor({
  content,
  placeholder = 'Tulis sesuatu…',
  editable = true,
  showToolbar = true,
  className,
  onChange,
  onSubmit,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // required for Next.js SSR — avoids hydration mismatch
    editable,
    extensions: [
      // StarterKit v3 already bundles Link, Underline and the list extensions.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
        },
      }),
      Placeholder.configure({ placeholder }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content ?? '',
    editorProps: {
      attributes: {
        class: 'prose-sm max-w-none text-sm text-foreground leading-relaxed focus:outline-none px-1 py-3',
      },
      handleKeyDown: (_view, event) => {
        if (onSubmit && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          onSubmit();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.({ json: editor.getJSON() as Record<string, unknown>, text: editor.getText() });
    },
  });

  // Keep editor in sync when the `content` prop changes to a different document
  // (e.g. selecting a different note). Guard against feedback loops.
  useEffect(() => {
    if (!editor) return;
    const incoming = JSON.stringify(content ?? '');
    const current = JSON.stringify(editor.getJSON());
    if (incoming !== current && content !== undefined) {
      editor.commands.setContent(content ?? '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  if (!editor) {
    return <div className={cn('tiptap-editor min-h-[120px] animate-pulse rounded-xl bg-muted/30', className)} />;
  }

  return (
    <div className={cn('tiptap-editor rounded-xl', editable && showToolbar && 'border border-border bg-card/40', className)}>
      {editable && showToolbar && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextEditor;
