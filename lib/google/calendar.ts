// =============================================================================
// Google Calendar helpers — thin REST wrappers (no SDK dependency).
// All functions run server-side only (they use OAuth tokens).
// =============================================================================

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * The OAuth redirect URI. Derived from the actual request origin so it always
 * matches wherever the app is served (any host/port) — this exact value must be
 * registered in the Google Cloud OAuth client's "Authorized redirect URIs".
 * Falls back to NEXT_PUBLIC_APP_URL when no request is available.
 */
export function redirectUri(req?: Request) {
  const origin = req
    ? new URL(req.url).origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${origin}/api/google/callback`;
}

export function buildAuthUrl(state: string, redirect: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirect,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(code: string, redirect: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number; id_token?: string }>;
}

export async function refreshToken(refresh: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refresh,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function getUserEmail(accessToken: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.email as string) || null;
}

// ── Calendar API ─────────────────────────────────────────────────────────────
type GEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

export async function listEvents(accessToken: string, calendarId: string, timeMin: string, timeMax: string) {
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
  const res = await fetch(`${CAL_BASE}/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`list events failed: ${res.status}`);
  const data = await res.json();
  return (data.items || []) as GEvent[];
}

export async function createEvent(accessToken: string, calendarId: string, body: unknown) {
  const res = await fetch(`${CAL_BASE}/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create event failed: ${res.status}`);
  return res.json() as Promise<GEvent>;
}

// ── Field mapping ────────────────────────────────────────────────────────────
const RRULE: Record<string, string> = { daily: 'RRULE:FREQ=DAILY', weekly: 'RRULE:FREQ=WEEKLY', monthly: 'RRULE:FREQ=MONTHLY' };

/** Map a Google event into our `events` row shape (without ids). */
export function googleToLocal(g: GEvent) {
  const allDay = !!g.start?.date && !g.start?.dateTime;
  const start = g.start?.dateTime || (g.start?.date ? `${g.start.date}T00:00:00.000Z` : null);
  const end = g.end?.dateTime || (g.end?.date ? `${g.end.date}T00:00:00.000Z` : null);
  if (!start || !end) return null;
  return {
    title: g.summary || '(Tanpa judul)',
    description: g.description || null,
    location: g.location || null,
    all_day: allDay,
    start_at: new Date(start).toISOString(),
    end_at: new Date(end).toISOString(),
    google_event_id: g.id,
  };
}

/** Map our event into a Google event body. */
export function localToGoogle(ev: { title: string; description: string | null; location: string | null; start_at: string; end_at: string; all_day: boolean; recurrence: string }) {
  const body: Record<string, unknown> = {
    summary: ev.title,
    description: ev.description || undefined,
    location: ev.location || undefined,
  };
  if (ev.all_day) {
    body.start = { date: ev.start_at.slice(0, 10) };
    body.end = { date: ev.end_at.slice(0, 10) };
  } else {
    body.start = { dateTime: new Date(ev.start_at).toISOString() };
    body.end = { dateTime: new Date(ev.end_at).toISOString() };
  }
  if (ev.recurrence && ev.recurrence !== 'none' && RRULE[ev.recurrence]) {
    body.recurrence = [RRULE[ev.recurrence]];
  }
  return body;
}
