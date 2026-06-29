// =============================================================================
// Calendar events data layer (browser). Thin, typed wrappers over Supabase so
// the calendar page and the dashboard share one source of truth.
// =============================================================================

import { createClient } from '@/lib/supabase/client';
import type { CalendarEvent, EventAttendee } from '@/types';

type DB = ReturnType<typeof createClient>;

const EVENT_SELECT =
  '*, creator:profiles!calendar_events_created_by_fkey(id,full_name,avatar_url,email), ' +
  'project:projects(id,name,icon,color), ' +
  'attendees:event_attendees(*, profile:profiles(id,full_name,avatar_url,email)), ' +
  'reminders:event_reminders(*), ' +
  'meeting:meetings(id,room_name,status)';

/**
 * Fetch events that could appear in [startISO, endISO]. Recurring events are
 * always included (their series may originate before the window) and expanded
 * client-side via `expandEvents`.
 */
export async function fetchEventsInRange(
  supabase: DB,
  workspaceId: string,
  startISO: string,
  endISO: string,
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select(EVENT_SELECT)
    .eq('workspace_id', workspaceId)
    .is('recurrence_parent_id', null)
    .or(`and(start_at.lte.${endISO},end_at.gte.${startISO}),recurrence_rule.not.is.null`)
    .order('start_at', { ascending: true });

  if (error) {
    console.error('fetchEventsInRange', error);
    return [];
  }
  return (data as unknown as CalendarEvent[]) || [];
}

export interface EventInput {
  workspace_id: string;
  project_id?: string | null;
  meeting_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  timezone?: string;
  color?: string;
  visibility?: 'workspace' | 'private';
  recurrence_rule?: string | null;
  created_by: string;
}

export async function createEvent(
  supabase: DB,
  input: EventInput,
  opts: { attendeeIds?: string[]; reminderMinutes?: number[] } = {},
): Promise<CalendarEvent | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(input)
    .select(EVENT_SELECT)
    .single();
  if (error || !data) {
    console.error('createEvent', error);
    return null;
  }
  const event = data as unknown as CalendarEvent;

  const attendeeRows = (opts.attendeeIds || []).map((uid) => ({
    event_id: event.id,
    user_id: uid,
    is_organizer: uid === input.created_by,
    status: uid === input.created_by ? 'accepted' : 'invited',
  }));
  // Always include the organizer as an accepted attendee.
  if (!attendeeRows.some((r) => r.user_id === input.created_by)) {
    attendeeRows.push({ event_id: event.id, user_id: input.created_by, is_organizer: true, status: 'accepted' });
  }
  if (attendeeRows.length) await supabase.from('event_attendees').insert(attendeeRows);

  const reminderRows = (opts.reminderMinutes || []).map((m) => ({
    event_id: event.id,
    user_id: input.created_by,
    minutes_before: m,
    method: 'app' as const,
  }));
  if (reminderRows.length) await supabase.from('event_reminders').insert(reminderRows);

  return event;
}

export async function updateEvent(
  supabase: DB,
  id: string,
  patch: Partial<EventInput>,
): Promise<CalendarEvent | null> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(patch)
    .eq('id', id)
    .select(EVENT_SELECT)
    .single();
  if (error || !data) {
    console.error('updateEvent', error);
    return null;
  }
  return data as unknown as CalendarEvent;
}

/** Move/resize a single event by absolute instants (used by drag + resize). */
export async function rescheduleEvent(
  supabase: DB,
  id: string,
  startISO: string,
  endISO: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_events')
    .update({ start_at: startISO, end_at: endISO })
    .eq('id', id);
  if (error) console.error('rescheduleEvent', error);
  return !error;
}

export async function deleteEvent(supabase: DB, id: string): Promise<boolean> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) console.error('deleteEvent', error);
  return !error;
}

/** Exclude one occurrence of a recurring series ("delete this occurrence"). */
export async function excludeOccurrence(
  supabase: DB,
  event: CalendarEvent,
  occurrenceStartISO: string,
): Promise<boolean> {
  const next = Array.from(new Set([...(event.recurrence_exdates || []), occurrenceStartISO]));
  const { error } = await supabase
    .from('calendar_events')
    .update({ recurrence_exdates: next })
    .eq('id', event.id);
  if (error) console.error('excludeOccurrence', error);
  return !error;
}

export async function setAttendeeStatus(
  supabase: DB,
  eventId: string,
  userId: string,
  status: EventAttendee['status'],
): Promise<boolean> {
  const { error } = await supabase
    .from('event_attendees')
    .update({ status })
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) console.error('setAttendeeStatus', error);
  return !error;
}
