'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';

export interface MentionItem {
  id: string;
  label: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
  noResultsText: string;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
        {props.noResultsText}
      </div>
    );
  }

  return (
    <div className="max-h-56 w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
      {props.items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          onClick={() => selectItem(index)}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
            index === selectedIndex ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
          )}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
            {item.label[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="truncate font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';
