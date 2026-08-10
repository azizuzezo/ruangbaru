'use client';

import { useLocale } from './locale-context';
import { dictionaries } from './dict';

/**
 * Namespaced translator. Keys within a namespace are flat (no dot-nesting) —
 * e.g. useT('tasks') then t('emptyStateTitle'). Missing keys fall back to
 * the key itself so a forgotten translation is visible, not blank.
 */
export function useT(namespace: string) {
  const { locale } = useLocale();
  const ns = (dictionaries as Record<string, Record<string, Record<string, string>>>)[locale]?.[namespace] ?? {};
  return (key: string): string => ns[key] ?? key;
}
