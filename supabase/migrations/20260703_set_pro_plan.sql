-- =============================================================================
-- One-off: upgrade aziz@duacincin.id's workspace(s) to the PRO plan.
-- Run in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- Note: `plan` lives on the workspace, not the user. This upgrades every
-- workspace owned by aziz@duacincin.id. Valid values: free | pro | business | enterprise.
-- =============================================================================

do $$
declare
  target_uid uuid;
  affected   integer;
begin
  select id into target_uid from public.profiles where email = 'aziz@duacincin.id';

  if target_uid is null then
    raise notice 'No profile found for aziz@duacincin.id — has the user signed up yet?';
    return;
  end if;

  update public.workspaces
     set plan = 'pro'
   where owner_id = target_uid;

  get diagnostics affected = row_count;
  raise notice 'Upgraded % workspace(s) owned by % to PRO.', affected, target_uid;
end $$;
