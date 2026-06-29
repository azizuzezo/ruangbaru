'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { TOUR_STEPS } from './steps';
import { TourOverlay } from './TourOverlay';

const STORAGE_KEY = 'ruangbaru:tour:v1';      // 'done' once finished or dismissed
const PROGRESS_KEY = 'ruangbaru:tour:progress'; // last viewed step index (for resume)

function readProgress(): number {
  try {
    const v = parseInt(localStorage.getItem(PROGRESS_KEY) || '0', 10);
    return Number.isFinite(v) ? v : 0;
  } catch { return 0; }
}
function writeProgress(i: number) {
  try { localStorage.setItem(PROGRESS_KEY, String(i)); } catch { /* ignore */ }
}
function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
}

type TourContextValue = {
  active: boolean;
  index: number;
  total: number;
  completed: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  /** Start only if the user has never finished/skipped the tour before. */
  maybeAutoStart: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within <TourProvider>');
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  // Assume completed until localStorage is read, to avoid an auto-start flash on SSR/first paint.
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    try {
      setCompleted(localStorage.getItem(STORAGE_KEY) === 'done');
    } catch {
      setCompleted(false);
    }
  }, []);

  const markDone = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'done'); } catch { /* ignore */ }
    setCompleted(true);
  }, []);

  // Replay if already completed, otherwise resume from the last viewed step.
  const start = useCallback(() => {
    let done = false;
    try { done = localStorage.getItem(STORAGE_KEY) === 'done'; } catch { done = false; }
    const resumeAt = done ? 0 : Math.min(readProgress(), TOUR_STEPS.length - 1);
    setIndex(resumeAt);
    setActive(true);
  }, []);

  // Finished the whole tour — mark done and reset progress.
  const finish = useCallback(() => {
    setActive(false);
    clearProgress();
    markDone();
  }, [markDone]);

  // Dismissed early — stop auto-nagging but remember where they left off.
  const skip = useCallback(() => {
    setActive(false);
    setIndex((i) => { writeProgress(i); return i; });
    markDone();
  }, [markDone]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= TOUR_STEPS.length) { finish(); return i; }
      writeProgress(i + 1);
      return i + 1;
    });
  }, [finish]);

  const prev = useCallback(() => setIndex((i) => { const n = Math.max(0, i - 1); writeProgress(n); return n; }), []);

  const maybeAutoStart = useCallback(() => {
    let done = false;
    try { done = localStorage.getItem(STORAGE_KEY) === 'done'; } catch { done = false; }
    if (!done) {
      // small delay so the dashboard has painted its tour anchors
      setTimeout(() => { setIndex(0); setActive(true); }, 600);
    }
  }, []);

  return (
    <TourContext.Provider
      value={{ active, index, total: TOUR_STEPS.length, completed, start, next, prev, skip, finish, maybeAutoStart }}
    >
      {children}
      <TourOverlay />
    </TourContext.Provider>
  );
}
