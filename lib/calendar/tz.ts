// =============================================================================
// Timezone helpers built on Intl (no external tz library). Events are stored as
// absolute UTC instants; the UI authors/edits them as wall-clock time in a
// chosen IANA timezone. These convert between the two.
// =============================================================================

/** Offset (ms) of `tz` relative to UTC at the given instant. */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = Number(p.value);
  const asUTC = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second);
  return asUTC - date.getTime();
}

/** "YYYY-MM-DDTHH:mm" wall-clock string (in `tz`) → absolute UTC ISO string. */
export function zonedInputToUtcISO(input: string, tz: string): string {
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return new Date(input).toISOString();
  const [, y, mo, d, hh, mm] = m.map(Number) as unknown as number[];
  const guess = Date.UTC(y, mo - 1, d, hh, mm);
  // Adjust by the tz offset at the guessed instant (one pass handles all but
  // the rare wall-clock-in-DST-gap case, which we accept).
  const offset = tzOffsetMs(new Date(guess), tz);
  return new Date(guess - offset).toISOString();
}

/** Absolute UTC ISO → "YYYY-MM-DDTHH:mm" wall-clock string in `tz` (for inputs). */
export function utcISOToZonedInput(iso: string, tz: string): string {
  const date = new Date(iso);
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}`;
}

/** The browser's current IANA timezone (fallback Asia/Jakarta). */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  } catch {
    return 'Asia/Jakarta';
  }
}

/** Curated IANA zones surfaced in the event editor (Indonesia first). */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Jakarta', label: 'WIB — Jakarta (GMT+7)' },
  { value: 'Asia/Makassar', label: 'WITA — Makassar (GMT+8)' },
  { value: 'Asia/Jayapura', label: 'WIT — Jayapura (GMT+9)' },
  { value: 'Asia/Singapore', label: 'Singapura (GMT+8)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (GMT+8)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (GMT+7)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
  { value: 'Europe/London', label: 'London (GMT+0/+1)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (GMT+1/+2)' },
  { value: 'America/New_York', label: 'New York (GMT-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8/-7)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
];

/** Short tz abbreviation for display, e.g. "GMT+7". */
export function tzShort(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value || tz;
  } catch {
    return tz;
  }
}
