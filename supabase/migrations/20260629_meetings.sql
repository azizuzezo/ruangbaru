-- =============================================================================
-- RuangBaru — Meetings (LiveKit) schema
-- Run this in the Supabase SQL editor (or via the CLI).
-- =============================================================================

-- ── meetings ────────────────────────────────────────────────────────────────
create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  title        text not null,
  description  text,
  room_name    text not null unique,
  status       text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  scheduled_at timestamptz,
  started_at   timestamptz,
  ended_at     timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists meetings_workspace_idx on public.meetings(workspace_id);
create index if not exists meetings_status_idx on public.meetings(workspace_id, status);

-- ── meeting_participants ─────────────────────────────────────────────────────
create table if not exists public.meeting_participants (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'participant' check (role in ('host','participant')),
  invited    boolean not null default false,
  joined_at  timestamptz,
  left_at    timestamptz,
  unique (meeting_id, user_id)
);
create index if not exists meeting_participants_meeting_idx on public.meeting_participants(meeting_id);

-- ── meeting_chat_messages ────────────────────────────────────────────────────
create table if not exists public.meeting_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists meeting_chat_meeting_idx on public.meeting_chat_messages(meeting_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_chat_messages enable row level security;

-- Helper predicate: the current user belongs to a workspace.
-- meetings: any workspace member can read/insert/update meetings of that workspace.
drop policy if exists meetings_member_select on public.meetings;
create policy meetings_member_select on public.meetings for select
  using (exists (select 1 from public.workspace_members wm
                 where wm.workspace_id = meetings.workspace_id and wm.user_id = auth.uid()));

drop policy if exists meetings_member_insert on public.meetings;
create policy meetings_member_insert on public.meetings for insert
  with check (created_by = auth.uid()
              and exists (select 1 from public.workspace_members wm
                          where wm.workspace_id = meetings.workspace_id and wm.user_id = auth.uid()));

drop policy if exists meetings_member_update on public.meetings;
create policy meetings_member_update on public.meetings for update
  using (exists (select 1 from public.workspace_members wm
                 where wm.workspace_id = meetings.workspace_id and wm.user_id = auth.uid()));

-- participants: visible/insertable to members of the meeting's workspace.
drop policy if exists mp_member_all on public.meeting_participants;
create policy mp_member_all on public.meeting_participants for all
  using (exists (select 1 from public.meetings m
                 join public.workspace_members wm on wm.workspace_id = m.workspace_id
                 where m.id = meeting_participants.meeting_id and wm.user_id = auth.uid()))
  with check (exists (select 1 from public.meetings m
                      join public.workspace_members wm on wm.workspace_id = m.workspace_id
                      where m.id = meeting_participants.meeting_id and wm.user_id = auth.uid()));

-- chat: same membership rule.
drop policy if exists mc_member_all on public.meeting_chat_messages;
create policy mc_member_all on public.meeting_chat_messages for all
  using (exists (select 1 from public.meetings m
                 join public.workspace_members wm on wm.workspace_id = m.workspace_id
                 where m.id = meeting_chat_messages.meeting_id and wm.user_id = auth.uid()))
  with check (exists (select 1 from public.meetings m
                      join public.workspace_members wm on wm.workspace_id = m.workspace_id
                      where m.id = meeting_chat_messages.meeting_id and wm.user_id = auth.uid()));

-- Optional: enable Supabase Realtime for live meeting/presence updates.
alter publication supabase_realtime add table public.meetings;
alter publication supabase_realtime add table public.meeting_participants;
