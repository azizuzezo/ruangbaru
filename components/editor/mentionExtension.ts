import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { MentionList, type MentionItem, type MentionListRef } from './MentionList';

/**
 * Builds a configured Mention extension instance. `usersRef` is read live on
 * every keystroke (not closed over at editor-creation time) so a workspace
 * member list that finishes loading after the editor mounts still shows up —
 * Tiptap's `useEditor` only reads its `extensions` array once, on creation.
 */
export function createMentionExtension(usersRef: { current: MentionItem[] }, noResultsText: string) {
  return Mention.configure({
    HTMLAttributes: { class: 'mention rounded-md bg-primary/10 px-1 py-0.5 font-semibold text-primary' },
    suggestion: {
      char: '@',
      items: ({ query }: { query: string }) =>
        usersRef.current
          .filter((u) => u.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8),
      render: () => {
        let component: ReactRenderer<MentionListRef, typeof MentionList>;
        let popup: TippyInstance[];

        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, {
              props: { ...props, noResultsText },
              editor: props.editor,
            });
            if (!props.clientRect) return;
            popup = tippy('body', {
              getReferenceClientRect: () => props.clientRect!()!,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: 'manual',
              placement: 'bottom-start',
              arrow: false,
              offset: [0, 4],
            });
          },
          onUpdate(props) {
            component.updateProps({ ...props, noResultsText });
            if (!props.clientRect) return;
            popup[0]?.setProps({ getReferenceClientRect: () => props.clientRect!()! });
          },
          onKeyDown(props) {
            if (props.event.key === 'Escape') {
              popup[0]?.hide();
              return true;
            }
            return component.ref?.onKeyDown(props) ?? false;
          },
          onExit() {
            popup[0]?.destroy();
            component.destroy();
          },
        };
      },
    },
  });
}
