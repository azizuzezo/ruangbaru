// =============================================================================
// Lightweight iCalendar RRULE support (no external dependency).
//
// Supports the subset RuangBaru's UI exposes: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY,
// INTERVAL, COUNT, UNTIL, and BYDAY (for weekly). Occurrence math runs on
// absolute instants via date-fns; the event's stored IANA timezone is used for
// display. Good enough for typical scheduling; exotic RRULE features (BYSETPOS,
// BYMONTHDAY lists, etc.) are intentionally out of scope.
// =============================================================================

import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfDay } from 'date-fns';
import type { CalendarEvent, EventOccurrence } from '@/types';

export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface ParsedRule {
  freq: Freq;
  interval: number;
  count?: number;
  until?: Date;
  byday?: Weekday[];
}

const MAX_OCCURRENCES = 730; // safety cap (~2y daily) to avoid runaway loops.

export function parseRRule(rule: string | null | undefined): ParsedRule | null {
  if (!rule) return null;
  const parts = rule.replace(/^RRULE:/i, '').split(';');
  const map: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k && v) map[k.toUpperCase()] = v;
  }
  const freq = map.FREQ as Freq | undefined;
  if (!freq || !['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null;
  const parsed: ParsedRule = {
    freq,
    interval: map.INTERVAL ? Math.max(1, parseInt(map.INTERVAL, 10)) : 1,
  };
  if (map.COUNT) parsed.count = Math.max(1, parseInt(map.COUNT, 10));
  if (map.UNTIL) {
    const u = parseICalDate(map.UNTIL);
    if (u) parsed.until = u;
  }
  if (map.BYDAY) {
    parsed.byday = map.BYDAY.split(',')
      .map((d) => d.trim().toUpperCase())
      .filter((d): d is Weekday => (WEEKDAYS as readonly string[]).includes(d));
  }
  return parsed;
}

export function buildRRule(p: ParsedRule): string {
  const out: string[] = [`FREQ=${p.freq}`];
  if (p.interval && p.interval > 1) out.push(`INTERVAL=${p.interval}`);
  if (p.byday && p.byday.length) out.push(`BYDAY=${p.byday.join(',')}`);
  if (p.count) out.push(`COUNT=${p.count}`);
  if (p.until) out.push(`UNTIL=${toICalDate(p.until)}`);
  return out.join(';');
}

/** Parse iCal date/datetime forms: 20260115T093000Z, 20260115T093000, 20260115. */
function parseICalDate(s: string): Date | null {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (hh === undefined) return new Date(Number(y), Number(mo) - 1, Number(d));
  if (z) return new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss));
  return new Date(+y, +mo - 1, +d, +hh, +mm, +ss);
}

function toICalDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(
    d.getUTCMinutes(),
  )}${p(d.getUTCSeconds())}Z`;
}

function addByFreq(date: Date, freq: Freq, interval: number): Date {
  switch (freq) {
    case 'DAILY': return addDays(date, interval);
    case 'WEEKLY': return addWeeks(date, interval);
    case 'MONTHLY': return addMonths(date, interval);
    case 'YEARLY': return addYears(date, interval);
  }
}

/**
 * Expand a (possibly recurring) event into concrete occurrences that intersect
 * [windowStart, windowEnd]. Non-recurring events yield at most one occurrence.
 * Excluded dates (recurrence_exdates) are skipped.
 */
export function expandEvent(event: CalendarEvent, windowStart: Date, windowEnd: Date): EventOccurrence[] {
  const dtStart = new Date(event.start_at);
  const durationMs = Math.max(0, new Date(event.end_at).getTime() - dtStart.getTime());
  const rule = parseRRule(event.recurrence_rule);
  const exdates = new Set((event.recurrence_exdates || []).map((d) => new Date(d).getTime()));

  const mk = (start: Date): EventOccurrence => ({
    key: `${event.id}:${start.toISOString()}`,
    event,
    start,
    end: new Date(start.getTime() + durationMs),
    isRecurring: !!rule,
  });

  const intersects = (start: Date) => {
    const end = new Date(start.getTime() + durationMs);
    return !isBefore(end, windowStart) && !isAfter(start, windowEnd);
  };

  if (!rule) {
    return intersects(dtStart) && !exdates.has(dtStart.getTime()) ? [mk(dtStart)] : [];
  }

  const out: EventOccurrence[] = [];
  let emitted = 0;

  // WEEKLY + BYDAY: walk week-anchors, emit each selected weekday in the week.
  if (rule.freq === 'WEEKLY' && rule.byday && rule.byday.length) {
    const wanted = new Set(rule.byday.map((d) => WEEKDAYS.indexOf(d)));
    // Anchor to the start of dtStart's week (Sunday), then step INTERVAL weeks.
    let weekAnchor = addDays(startOfDay(dtStart), -dtStart.getDay());
    for (let i = 0; i < MAX_OCCURRENCES; i++) {
      for (let dow = 0; dow < 7; dow++) {
        if (!wanted.has(dow)) continue;
        const day = addDays(weekAnchor, dow);
        const start = new Date(day);
        start.setHours(dtStart.getHours(), dtStart.getMinutes(), dtStart.getSeconds(), 0);
        if (isBefore(start, dtStart)) continue;
        if (rule.until && isAfter(start, rule.until)) return out;
        if (rule.count && emitted >= rule.count) return out;
        emitted++;
        if (exdates.has(start.getTime())) continue;
        if (start.getTime() > windowEnd.getTime() + durationMs) return out;
        if (intersects(start)) out.push(mk(start));
      }
      weekAnchor = addWeeks(weekAnchor, rule.interval);
      if (isAfter(weekAnchor, windowEnd) && (!rule.count || emitted >= rule.count)) break;
    }
    return out;
  }

  // Simple frequencies: step from DTSTART.
  let cur = dtStart;
  for (let i = 0; i < MAX_OCCURRENCES; i++) {
    if (rule.until && isAfter(cur, rule.until)) break;
    if (rule.count && emitted >= rule.count) break;
    emitted++;
    if (!exdates.has(cur.getTime()) && intersects(cur)) out.push(mk(cur));
    cur = addByFreq(cur, rule.freq, rule.interval);
    if (isAfter(cur, windowEnd)) break;
  }
  return out;
}

/** Expand many events into a flat, time-sorted occurrence list for a window. */
export function expandEvents(events: CalendarEvent[], windowStart: Date, windowEnd: Date): EventOccurrence[] {
  return events
    .flatMap((e) => expandEvent(e, windowStart, windowEnd))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

const DAY_LABELS_ID: Record<Weekday, string> = {
  SU: 'Minggu', MO: 'Senin', TU: 'Selasa', WE: 'Rabu', TH: 'Kamis', FR: 'Jumat', SA: 'Sabtu',
};

/** Human-readable Indonesian description of a recurrence rule. */
export function describeRRule(rule: string | null | undefined): string {
  const p = parseRRule(rule);
  if (!p) return 'Tidak berulang';
  const every = p.interval > 1 ? `setiap ${p.interval} ` : 'setiap ';
  let base: string;
  switch (p.freq) {
    case 'DAILY': base = p.interval > 1 ? `${every}hari` : 'Setiap hari'; break;
    case 'WEEKLY':
      if (p.byday?.length) {
        const days = p.byday.map((d) => DAY_LABELS_ID[d]).join(', ');
        base = `${p.interval > 1 ? every + 'minggu' : 'Mingguan'} pada ${days}`;
      } else base = p.interval > 1 ? `${every}minggu` : 'Setiap minggu';
      break;
    case 'MONTHLY': base = p.interval > 1 ? `${every}bulan` : 'Setiap bulan'; break;
    case 'YEARLY': base = p.interval > 1 ? `${every}tahun` : 'Setiap tahun'; break;
  }
  if (p.count) base += `, ${p.count}x`;
  else if (p.until) base += `, sampai ${p.until.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return base;
}

/** Presets surfaced in the event editor's recurrence picker. */
export const RECURRENCE_PRESETS: { label: string; rule: string | null }[] = [
  { label: 'Tidak berulang', rule: null },
  { label: 'Setiap hari', rule: 'FREQ=DAILY' },
  { label: 'Setiap minggu', rule: 'FREQ=WEEKLY' },
  { label: 'Setiap hari kerja (Sen–Jum)', rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { label: 'Setiap 2 minggu', rule: 'FREQ=WEEKLY;INTERVAL=2' },
  { label: 'Setiap bulan', rule: 'FREQ=MONTHLY' },
  { label: 'Setiap tahun', rule: 'FREQ=YEARLY' },
];
