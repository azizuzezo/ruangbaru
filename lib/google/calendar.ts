// =============================================================================
// Google Calendar REST client + two-way sync mapping (no googleapis dep).
//
// Uses fetch against the Calendar v3 + OAuth token endpoints. All entry points
// are guarded by `isGoogleConfigured()` upstream. Tokens are read from the
// `google_calendar_accounts` row and refreshed transparently.
// =============================================================================

import { isGoogleConfigured, googleRedirectUri } from '@/lib/google/config';
import type { CalendarEvent } from '@/types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_BASE = 'https://www.googleapis.com/calendar/v3';

export interface GoogleAccountRow {
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  calendar_id: string;
  sync_token: string | null;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

/** Exchange an authorization code for tokens (used by the OAuth callback). */
export async function exchangeCode(code: string): Promise<TokenResponse | null> {
  if (!isGoogleConfigured()) return null;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
}

/** Return a valid access token, refreshing if expired. Returns null on failure. */
export async function freshAccessToken(account: GoogleAccountRow): Promise<{ token: string; refreshed?: { access_token: string; token_expiry: string } } | null> {
  if (!isGoogleConfigured()) return null;
  const notExpired = account.token_expiry && new Date(account.token_expiry).getTime() - 60_000 > Date.now();
  if (account.access_token && notExpired) return { token: account.access_token };
  if (!account.refresh_token) return null;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: account.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as TokenResponse;
  const token_expiry = new Date(Date.now() + json.expires_in * 1000).toISOString();
  return { token: json.access_token, refreshed: { access_token: json.access_token, token_expiry } };
}

// ── Mapping: Google event <-> RuangBaru calendar_event ───────────────────────

type GoogleDate = { dateTime?: string; date?: string; timeZone?: string };
export interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleDate;
  end?: GoogleDate;
  recurrence?: string[];
  etag?: string;
  updated?: string;
}

export function googleToLocal(g: GoogleEvent, workspaceId: string, userId: string): Partial<CalendarEvent> | null {
  if (g.status === 'cancelled' || !g.start || !g.end) return null;
  const allDay = Boolean(g.start.date && !g.start.dateTime);
  const start = g.start.dateTime || (g.start.date ? `${g.start.date}T00:00:00Z` : null);
  const end = g.end.dateTime || (g.end.date ? `${g.end.date}T00:00:00Z` : null);
  if (!start || !end) return null;
  const rrule = (g.recurrence || []).find((r) => r.startsWith('RRULE:'))?.replace(/^RRULE:/, '') || null;
  return {
    workspace_id: workspaceId,
    created_by: userId,
    title: g.summary || '(Tanpa judul)',
    description: g.description || null,
    location: g.location || null,
    start_at: new Date(start).toISOString(),
    end_at: new Date(end).toISOString(),
    all_day: allDay,
    timezone: g.start.timeZone || 'Asia/Jakarta',
    recurrence_rule: rrule,
    google_event_id: g.id,
    google_etag: g.etag || null,
  };
}

export function localToGoogle(e: CalendarEvent): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: e.title,
    description: e.description || undefined,
    location: e.location || undefined,
  };
  if (e.all_day) {
    body.start = { date: e.start_at.slice(0, 10) };
    body.end = { date: e.end_at.slice(0, 10) };
  } else {
    body.start = { dateTime: e.start_at, timeZone: e.timezone };
    body.end = { dateTime: e.end_at, timeZone: e.timezone };
  }
  if (e.recurrence_rule) body.recurrence = [`RRULE:${e.recurrence_rule}`];
  return body;
}

// ── Pull: list changed events (incremental via syncToken) ────────────────────

export interface PullResult {
  events: GoogleEvent[];
  nextSyncToken: string | null;
  fullResyncRequired: boolean;
}

export async function pullChanges(token: string, calendarId: string, syncToken: string | null): Promise<PullResult> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params = new URLSearchParams({ singleEvents: 'false', showDeleted: 'true', maxResults: '250' });
    if (syncToken) params.set('syncToken', syncToken);
    else params.set('timeMin', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString());
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 410) return { events: [], nextSyncToken: null, fullResyncRequired: true };
    if (!res.ok) break;
    const json = (await res.json()) as { items?: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string };
    events.push(...(json.items || []));
    pageToken = json.nextPageToken;
    if (json.nextSyncToken) nextSyncToken = json.nextSyncToken;
  } while (pageToken);

  return { events, nextSyncToken, fullResyncRequired: false };
}

// ── Push: create / update a Google event from a local one ────────────────────

export async function pushEvent(token: string, calendarId: string, e: CalendarEvent): Promise<{ id: string; etag?: string } | null> {
  const body = localToGoogle(e);
  const isUpdate = Boolean(e.google_event_id);
  const url = isUpdate
    ? `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${e.google_event_id}`
    : `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;
  const res = await fetch(url, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { id: string; etag?: string };
  return { id: json.id, etag: json.etag };
}
