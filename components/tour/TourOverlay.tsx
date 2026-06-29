'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { TOUR_STEPS } from './steps';
import { useTour } from './TourProvider';

const BLUE = '#106CD8';
const E = [0.22, 1, 0.36, 1] as [number, number, number, number];
const HOLE_PAD = 6;   // padding around the highlighted element
const GAP = 14;       // gap between element and tooltip
const MARGIN = 16;    // min distance from viewport edges
const TT_W = 360;
const DIM = 'rgba(2,6,23,0.55)';
const EASE_CSS = 'cubic-bezier(0.22,1,0.36,1)';

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };
type Pos = { left: number; top: number; maxH: number };

export function TourOverlay() {
  const { active, index, total, next, prev, skip } = useTour();
  const reduce = useReducedMotion();
  const ttRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<Rect | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);

  const step = TOUR_STEPS[index];
  const isLast = index === total - 1;

  // ── Compute the best tooltip position given the element rect ──────────────
  const computePos = useCallback((r: Rect | null) => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tt = ttRef.current;
    const w = tt?.offsetWidth || TT_W;
    const h = tt?.offsetHeight || 320;
    const maxH = vh - MARGIN * 2;
    const fitH = Math.min(h, maxH);

    if (!r) {
      setPos({ left: Math.round((vw - w) / 2), top: Math.round(Math.max(MARGIN, (vh - fitH) / 2)), maxH });
      return;
    }

    const clampX = (x: number) => Math.min(Math.max(x, MARGIN), Math.max(MARGIN, vw - w - MARGIN));
    const clampY = (y: number) => Math.min(Math.max(y, MARGIN), Math.max(MARGIN, vh - fitH - MARGIN));

    const spaceBottom = vh - r.bottom - GAP;
    const spaceTop = r.top - GAP;
    const spaceRight = vw - r.right - GAP;
    const spaceLeft = r.left - GAP;

    let left: number;
    let top: number;

    if (spaceBottom >= fitH) {
      top = r.bottom + GAP;
      left = clampX(r.left + r.width / 2 - w / 2);
    } else if (spaceTop >= fitH) {
      top = r.top - GAP - fitH;
      left = clampX(r.left + r.width / 2 - w / 2);
    } else if (spaceRight >= w) {
      left = r.right + GAP;
      top = clampY(r.top + r.height / 2 - fitH / 2);
    } else if (spaceLeft >= w) {
      left = r.left - GAP - w;
      top = clampY(r.top + r.height / 2 - fitH / 2);
    } else {
      // Nothing fits cleanly — choose the side with the most room and clamp.
      const max = Math.max(spaceBottom, spaceTop, spaceRight, spaceLeft);
      if (max === spaceRight) { left = clampX(r.right + GAP); top = clampY(r.top + r.height / 2 - fitH / 2); }
      else if (max === spaceLeft) { left = clampX(r.left - GAP - w); top = clampY(r.top + r.height / 2 - fitH / 2); }
      else if (max === spaceBottom) { top = clampY(r.bottom + GAP); left = clampX(r.left + r.width / 2 - w / 2); }
      else { top = clampY(r.top - GAP - fitH); left = clampX(r.left + r.width / 2 - w / 2); }
    }

    setPos({ left: Math.round(left), top: Math.round(top), maxH });
  }, []);

  // ── Measure the target element (optionally scrolling it into view) ────────
  const reposition = useCallback((doScroll: boolean) => {
    if (!step?.target) { rectRef.current = null; setRect(null); computePos(null); return; }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) { rectRef.current = null; setRect(null); computePos(null); return; }
    if (doScroll) el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    requestAnimationFrame(() => {
      const b = el.getBoundingClientRect();
      const r: Rect = { top: b.top, left: b.left, right: b.right, bottom: b.bottom, width: b.width, height: b.height };
      rectRef.current = r;
      setRect(r);
      computePos(r);
    });
  }, [step?.target, reduce, computePos]);

  // Re-measure on step change (and again after smooth-scroll settles).
  useEffect(() => {
    if (!active) return;
    reposition(true);
    const t = setTimeout(() => reposition(false), 380);
    return () => clearTimeout(t);
  }, [active, index, reposition]);

  // Keep in sync with scroll / resize.
  useEffect(() => {
    if (!active) return;
    const onChange = () => reposition(false);
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [active, reposition]);

  // Recompute when the tooltip's own size changes (content differs per step).
  useEffect(() => {
    if (!active || !ttRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => computePos(rectRef.current));
    ro.observe(ttRef.current);
    return () => ro.disconnect();
  }, [active, computePos]);

  // Keyboard controls.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, next, prev, skip]);

  if (!active || !step) return null;

  // Hole geometry (with padding). The element inside the hole stays clickable.
  const hole = rect && {
    top: Math.max(0, rect.top - HOLE_PAD),
    left: Math.max(0, rect.left - HOLE_PAD),
    width: rect.width + HOLE_PAD * 2,
    height: rect.height + HOLE_PAD * 2,
  };
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const maskBase: React.CSSProperties = { position: 'fixed', background: DIM, pointerEvents: 'auto', transition: `all 0.3s ${EASE_CSS}` };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: 'none' }}
    >
      {/* Dim mask — 4 rectangles leaving an interactive hole around the target */}
      {hole ? (
        <>
          <div style={{ ...maskBase, top: 0, left: 0, width: '100%', height: hole.top }} />
          <div style={{ ...maskBase, top: hole.top + hole.height, left: 0, width: '100%', height: Math.max(0, vh - hole.top - hole.height) }} />
          <div style={{ ...maskBase, top: hole.top, left: 0, width: hole.left, height: hole.height }} />
          <div style={{ ...maskBase, top: hole.top, left: hole.left + hole.width, width: Math.max(0, vw - hole.left - hole.width), height: hole.height }} />
          {/* Highlight ring */}
          <div
            style={{
              position: 'fixed', top: hole.top, left: hole.left, width: hole.width, height: hole.height,
              borderRadius: 12, outline: `2px solid ${BLUE}`, outlineOffset: 0, boxShadow: `0 0 0 4px ${BLUE}22`,
              pointerEvents: 'none', transition: `all 0.3s ${EASE_CSS}`,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0" style={{ background: DIM, pointerEvents: 'auto' }} />
      )}

      {/* Tooltip */}
      <div
        ref={ttRef}
        className="fixed flex flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
        style={{
          width: TT_W,
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: pos?.maxH,
          left: pos?.left ?? -9999,
          top: pos?.top ?? -9999,
          opacity: pos ? 1 : 0,
          pointerEvents: 'auto',
          transition: `left 0.3s ${EASE_CSS}, top 0.3s ${EASE_CSS}, opacity 0.2s linear`,
        }}
      >
        {/* Accent bar (fixed) */}
        <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${BLUE}, #10B29F)` }} />

        {/* Scrollable content */}
        <div className="overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: E }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Langkah {index + 1} dari {total}
                </p>
                <button onClick={skip} className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Lewati tur">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="mt-1.5 text-lg font-bold tracking-tight text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.what}</p>

              <div className="mt-3 space-y-2">
                {step.why && <LabeledLine label="Kenapa" text={step.why} color="#106CD8" />}
                {step.when && <LabeledLine label="Kapan" text={step.when} color="#10B29F" />}
                {step.tip && <LabeledLine label="Tips" text={step.tip} color="#FDB31A" />}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress */}
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full" style={{ background: BLUE }}
              initial={false} animate={{ width: `${((index + 1) / total) * 100}%` }} transition={{ duration: 0.4, ease: E }}
            />
          </div>

          {/* Controls */}
          <div className="mt-4 flex items-center justify-between">
            <button onClick={skip} className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">Lewati tur</button>
            <div className="flex items-center gap-2">
              {index > 0 && (
                <button onClick={prev} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent">
                  <ArrowLeft className="h-3.5 w-3.5" /> Kembali
                </button>
              )}
              <button onClick={next} className="inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90" style={{ background: BLUE }}>
                {isLast ? (<><Check className="h-3.5 w-3.5" /> Selesai</>) : (<>Lanjut <ArrowRight className="h-3.5 w-3.5" /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LabeledLine({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${color}1A`, color }}>
        {label}
      </span>
      <span className="text-xs leading-relaxed text-muted-foreground">{text}</span>
    </div>
  );
}
