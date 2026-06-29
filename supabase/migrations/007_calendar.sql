-- =============================================================================
-- RuangBaru — Calendar / Events schema
-- Run AFTER 006 (and the meetings migration). Idempotent where possible.
--
-- Adds a real event model: timezone-aware events, recurrence (RRULE), per-user
-- reminders, attendees (shared team calendars), an optional link to a LiveKit
-- meeting, and Google Calendar two-way-sync bookkeeping fields. Google sync is
-- inert until the server has Google OAuth credentials configured.
-- =============================================================================

-- ── calendar_events ──────────────────────────────────────────────────────────
create table if not exists public.calendar_events (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces(id) on delete cascade,
  project_id           uuid references public.projects(id) on delete set null,
  meeting_id           uuid references public.meetings(id) on delete set null,
  title                text not null,
  description          text,
  location             text,
  start_at             timestamptz not null,
  end_at               timestamptz not null,
  all_day              boolean not null default false,
  -- IANA timezone the event was authored in (e.g. 'Asia/Jakarta'). start/end are
  -- always stored as absolute UTC instants; this is for display + RRULE math.
  timezone             text not null default 'Asia/Jakarta',
  color                text not null default '#106CD8',
  -- 'workspace' = visible to all members (shared team calendar);
  -- 'private'   = visible only to creator + invited attendees.
  visibility           text not null default 'workspace' check (visibility in ('workspace','private')),
  -- iCalendar RRULE string (without the "RRULE:" prefix), null = single event.
  recurrence_rule      text,
  -- For a one-off override of a single occurrence in a series:
  recurrence_parent_id uuid references public.calendar_events(id) on delete cascade,
  original_start_at    timestamptz,
  -- Excluded occurrence start instants (cancelled single dates of a series).
  recurrence_exdates   timestamptz[] not null default '{}',
  created_by           uuid references public.profiles(id) on delete set null,
  -- Google Calendar sync bookkeeping (unused until OAuth configured).
  google_event_id      text,
  google_calendar_id   text,
  google_etag          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists calendar_events_workspace_idx on public.calendar_events(workspace_id, start_at);
create index if not exists calendar_events_project_idx   on public.calendar_events(project_id);
create index if not exists calendar_events_parent_idx    on public.calendar_events(recurrence_parent_id);
create unique index if not exists calendar_events_google_uq
  on public.calendar_events(created_by, google_event_id) where google_event_id is not null;

-- ── event_attendees (shared team calendars / invites) ────────────────────────
create table if not exists public.event_attendees (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.calendar_events(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'invited' check (status in ('invited','accepted','declined','tentative')),
  is_organizer boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists event_attendees_event_idx on public.event_attendees(event_id);
create index if not exists event_attendees_user_idx  on public.event_attendees(user_id);

-- ── event_reminders (per-user or all-attendee reminders) ─────────────────────
create table if not exists public.event_reminders (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.calendar_events(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade, -- null = all attendees
  minutes_before integer not null default 10 check (minutes_before >= 0),
  method        text not null default 'app' check (method in ('app','email')),
  -- For a specific fired occurrence so a recurring event reminds each time.
  last_fired_for timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists event_reminders_event_idx on public.event_reminders(event_id);

-- ── google_calendar_accounts (per-user OAuth link; inert until configured) ───
create table if not exists public.google_calendar_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.profiles(id) on delete cascade,
  google_email  text,
  access_token  text,
  refresh_token text,
  token_expiry  timestamptz,
  calendar_id   text not null default 'primary',
  sync_token    text,                 -- incremental pull cursor
  channel_id    text,                 -- push-notification channel
  resource_id   text,
  channel_expiry timestamptz,
  sync_enabled  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.calendar_events         enable row level security;
alter table public.event_attendees         enable row level security;
alter table public.event_reminders         enable row level security;
alter table public.google_calendar_accounts enable row level security;

-- calendar_events: workspace members can see shared events; private events are
-- limited to the creator and invited attendees.
drop policy if exists ce_select on public.calendar_events;
create policy ce_select on public.calendar_events for select
  using (
    exists (select 1 from public.workspace_members wm
            where wm.workspace_id = calendar_events.workspace_id and wm.user_id = auth.uid())
    and (
      visibility = 'workspace'
      or created_by = auth.uid()
      or exists (select 1 from public.event_attendees ea
                 where ea.event_id = calendar_events.id and ea.user_id = auth.uid())
    )
  );

drop policy if exists ce_insert on public.calendar_events;
create policy ce_insert on public.calendar_events for insert
  with check (created_by = auth.uid()
              and exists (select 1 from public.workspace_members wm
                          where wm.workspace_id = calendar_events.workspace_id and wm.user_id = auth.uid()));

drop policy if exists ce_update on public.calendar_events;
create policy ce_update on public.calendar_events for update
  using (
    exists (select 1 from public.workspace_members wm
            where wm.workspace_id = calendar_events.workspace_id and wm.user_id = auth.uid())
    and (visibility = 'workspace' or created_by = auth.uid())
  );

drop policy if exists ce_delete on public.calendar_events;
create policy ce_delete on public.calendar_events for delete
  using (created_by = auth.uid()
         or exists (select 1 from public.workspace_members wm
                    where wm.workspace_id = calendar_events.workspace_id
                      and wm.user_id = auth.uid() and wm.role in ('owner','admin')));

-- attendees: any member of the event's workspace may read/manage.
drop policy if exists ea_all on public.event_attendees;
create policy ea_all on public.event_attendees for all
  using (exists (select 1 from public.calendar_events e
                 join public.workspace_members wm on wm.workspace_id = e.workspace_id
                 where e.id = event_attendees.event_id and wm.user_id = auth.uid()))
  with check (exists (select 1 from public.calendar_events e
                      join public.workspace_members wm on wm.workspace_id = e.workspace_id
                      where e.id = event_attendees.event_id and wm.user_id = auth.uid()));

-- reminders: the owning user, or the event creator, may manage.
drop policy if exists er_all on public.event_reminders;
create policy er_all on public.event_reminders for all
  using (
    event_reminders.user_id = auth.uid()
    or exists (select 1 from public.calendar_events e
               where e.id = event_reminders.event_id and e.created_by = auth.uid())
  )
  with check (
    event_reminders.user_id = auth.uid()
    or exists (select 1 from public.calendar_events e
               where e.id = event_reminders.event_id and e.created_by = auth.uid())
  );

-- google accounts: strictly the owner.
drop policy if exists gca_owner on public.google_calendar_accounts;
create policy gca_owner on public.google_calendar_accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Grants (RuangBaru needs BOTH grants AND RLS — see MEMORY.md gotcha #5) ────
grant select, insert, update, delete on public.calendar_events          to authenticated;
grant select, insert, update, delete on public.event_attendees          to authenticated;
grant select, insert, update, delete on public.event_reminders          to authenticated;
grant select, insert, update, delete on public.google_calendar_accounts to authenticated;
grant all on public.calendar_events, public.event_attendees,
             public.event_reminders, public.google_calendar_accounts to service_role;

-- ── updated_at trigger (reuse if a shared one exists; define defensively) ─────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists calendar_events_touch on public.calendar_events;
create trigger calendar_events_touch before update on public.calendar_events
  for each row execute function public.touch_updated_at();

drop trigger if exists gca_touch on public.google_calendar_accounts;
create trigger gca_touch before update on public.google_calendar_accounts
  for each row execute function public.touch_updated_at();

-- ── Realtime (live shared-calendar updates) ──────────────────────────────────
alter publication supabase_realtime add table public.calendar_events;
alter publication supabase_realtime add table public.event_attendees;
