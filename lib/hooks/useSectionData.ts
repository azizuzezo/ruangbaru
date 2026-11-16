'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';

/**
 * One independently loading slice of a page. Each dashboard section owns
 * one of these, so a slow or failing query only holds back (or breaks) its
 * own card instead of the whole page, and can be retried on its own.
 *
 * `load` should throw on failure. `setData` is a stable React-style setter
 * so realtime hooks and optimistic updates can write into the same state.
 *
 * Loading is derived, not toggled: a request is "settled" once its key
 * (deps + retry count) has a result, so the effect only sets state from the
 * async callback.
 */
export function useSectionData<T>(enabled: boolean, load: () => Promise<T>, deps: unknown[], initial: T) {
  const [data, setDataState] = useState<T>(initial);
  const [settled, setSettled] = useState<{ key: string | null; error: boolean }>({ key: null, error: false });
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify([nonce, ...deps]);

  const run = useEffectEvent(() => load());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    run()
      .then((d) => {
        if (cancelled) return;
        setDataState(d);
        setSettled({ key, error: false });
      })
      .catch((err) => {
        console.error('Section failed to load:', err);
        if (!cancelled) setSettled({ key, error: true });
      });
    return () => { cancelled = true; };
  }, [enabled, key]);

  const loading = settled.key !== key;
  const setData = useCallback((next: React.SetStateAction<T>) => setDataState(next), []);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, setData, loading, error: !loading && settled.error, reload };
}
