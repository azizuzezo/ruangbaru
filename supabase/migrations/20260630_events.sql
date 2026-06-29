-- =============================================================================
-- RuangBaru — Calendar events schema
-- Run this in the Supabase SQL editor (after the meetings migration).
-- =============================================================================

create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  title            text not null,
  description      text,
  location         text,
  color            text not null default '#106CD8',
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  all_day          boolean not null default false,
  recurrence       text not null default 'none' check (recurrence in ('none','daily','weekly','monthly')),
  recurrence_until date,
  reminder_minutes integer,
  meeting_id       uuid references public.meetings(id) on delete set null,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists events_workspace_idx on public.events(workspace_id);
create index if not exists events_range_idx on public.events(workspace_id, start_at);

create table if not exists public.event_attendees (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  status    text not null default 'invited' check (status in ('invited','accepted','declined')),
  unique (event_id, user_id)
);
create index if not exists event_attendees_event_idx on public.event_attendees(event_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;

drop policy if exists events_member_select on public.events;
create policy events_member_select on public.events for select
  using (exists (select 1 from public.workspace_members wm
                 where wm.workspace_id = events.workspace_id and wm.user_id = auth.uid()));

drop policy if exists events_member_insert on public.events;
create policy events_member_insert on public.events for insert
  with check (exists (select 1 from public.workspace_members wm
                      where wm.workspace_id = events.workspace_id and wm.user_id = auth.uid()));

drop policy if exists events_member_update on public.events;
create policy events_member_update on public.events for update
  using (exists (select 1 from public.workspace_members wm
                 where wm.workspace_id = events.workspace_id and wm.user_id = auth.uid()));

drop policy if exists events_member_delete on public.events;
create policy events_member_delete on public.events for delete
  using (exists (select 1 from public.workspace_members wm
                 where wm.workspace_id = events.workspace_id and wm.user_id = auth.uid()));

drop policy if exists ea_member_all on public.event_attendees;
create policy ea_member_all on public.event_attendees for all
  using (exists (select 1 from public.events e
                 join public.workspace_members wm on wm.workspace_id = e.workspace_id
                 where e.id = event_attendees.event_id and wm.user_id = auth.uid()))
  with check (exists (select 1 from public.events e
                      join public.workspace_members wm on wm.workspace_id = e.workspace_id
                      where e.id = event_attendees.event_id and wm.user_id = auth.uid()));

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_attendees;
