-- =============================================================================
-- RuangBaru — Google Calendar integration
-- Run in the Supabase SQL editor (after the events migration).
-- =============================================================================

-- Per-user, per-workspace Google connection (stores OAuth tokens).
create table if not exists public.google_calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  google_email  text,
  access_token  text,
  refresh_token text,
  token_expiry  timestamptz,
  calendar_id   text not null default 'primary',
  last_synced_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, workspace_id)
);

alter table public.google_calendar_connections enable row level security;

-- A user can only see/manage their own connections.
drop policy if exists gcc_owner_all on public.google_calendar_connections;
create policy gcc_owner_all on public.google_calendar_connections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Link RuangBaru events to their Google counterpart (for two-way dedup).
alter table public.events add column if not exists google_event_id text;
alter table public.events add column if not exists synced_at timestamptz;
create index if not exists events_google_idx on public.events(workspace_id, google_event_id);
