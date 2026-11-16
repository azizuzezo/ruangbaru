'use client';

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Read-only renderer for Tiptap JSON. Unlike a plaintext dump, this keeps
 * @mention nodes intact and turns each one into a clickable name, so a tag in
 * a task description or comment reads as a person and goes somewhere useful.
 */
type DocNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: DocNode[];
};

interface RenderCtx {
  names: Map<string, string>;
  hrefForMention: (id: string) => string;
}

function applyMarks(text: string, marks: DocNode['marks'], key: string): ReactNode {
  let node: ReactNode = text;
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case 'bold': node = <strong>{node}</strong>; break;
      case 'italic': node = <em>{node}</em>; break;
      case 'strike': node = <s>{node}</s>; break;
      case 'code': node = <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]">{node}</code>; break;
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '#';
        const external = /^https?:\/\//.test(href);
        node = external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{node}</a>
        ) : (
          <Link href={href} className="text-primary underline underline-offset-2">{node}</Link>
        );
        break;
      }
    }
  }
  return <Fragment key={key}>{node}</Fragment>;
}

function renderNode(node: DocNode, key: string, ctx: RenderCtx): ReactNode {
  if (node.type === 'text') return applyMarks(node.text ?? '', node.marks, key);

  if (node.type === 'mention') {
    const id = typeof node.attrs?.id === 'string' ? node.attrs.id : '';
    const label = ctx.names.get(id) || (typeof node.attrs?.label === 'string' ? node.attrs.label : '');
    const display = label.startsWith('@') ? label : `@${label || 'Anggota'}`;
    return (
      <Link
        key={key}
        href={ctx.hrefForMention(id)}
        title={label}
        className="mx-0.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 align-baseline text-[0.95em] font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {display}
      </Link>
    );
  }

  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'horizontalRule') return <hr key={key} className="my-2 border-border" />;

  const children = node.content?.map((child, i) => renderNode(child, `${key}-${i}`, ctx));

  switch (node.type) {
    case 'paragraph': return <p key={key} className="my-1 first:mt-0 last:mb-0">{children}</p>;
    case 'heading': {
      const level = Number(node.attrs?.level) || 3;
      const Tag = (level <= 3 ? `h${level}` : 'h4') as 'h1' | 'h2' | 'h3' | 'h4';
      return <Tag key={key} className="mb-1 mt-2 font-semibold first:mt-0">{children}</Tag>;
    }
    case 'bulletList': return <ul key={key} className="my-1 list-disc pl-5">{children}</ul>;
    case 'orderedList': return <ol key={key} className="my-1 list-decimal pl-5">{children}</ol>;
    case 'listItem': return <li key={key}>{children}</li>;
    case 'taskList': return <ul key={key} className="my-1 list-none pl-1">{children}</ul>;
    case 'taskItem': return <li key={key} className="flex items-start gap-1.5">{children}</li>;
    case 'blockquote': return <blockquote key={key} className="my-1 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>;
    case 'codeBlock': return <pre key={key} className="my-1 overflow-x-auto rounded-lg bg-muted p-2 text-xs"><code>{children}</code></pre>;
    default: return <Fragment key={key}>{children}</Fragment>;
  }
}

export function RichTextContent({
  content,
  mentionUsers = [],
  hrefForMention,
  className,
}: {
  content: Record<string, unknown> | null | undefined;
  mentionUsers?: Array<{ id: string; label: string }>;
  hrefForMention: (id: string) => string;
  className?: string;
}) {
  if (!content) return null;
  const ctx: RenderCtx = {
    names: new Map(mentionUsers.map((u) => [u.id, u.label])),
    hrefForMention,
  };
  return <div className={cn('text-sm leading-relaxed text-foreground', className)}>{renderNode(content as DocNode, 'root', ctx)}</div>;
}

export default RichTextContent;
