-- =============================================================================
-- One-off: make aziz@duacincin.id the OWNER + ADMIN of their workspace(s).
-- Run in the Supabase SQL editor. Safe to re-run (idempotent).
--
-- Role model: 'owner' is the highest role and already includes admin rights
-- (is_workspace_admin() treats owner/admin the same), so we set role = 'owner'.
-- =============================================================================

do $$
declare
  target_uid uuid;
begin
  -- Resolve the user id from their profile email.
  select id into target_uid from public.profiles where email = 'aziz@duacincin.id';

  if target_uid is null then
    raise notice 'No profile found for aziz@duacincin.id — has the user signed up yet?';
    return;
  end if;

  -- 1) Make them the owner of every workspace they belong to.
  update public.workspaces w
     set owner_id = target_uid
   where exists (
     select 1 from public.workspace_members m
      where m.workspace_id = w.id and m.user_id = target_uid
   );

  -- 2) Elevate their membership role to 'owner' (covers admin) everywhere.
  update public.workspace_members
     set role = 'owner'
   where user_id = target_uid;

  raise notice 'Done. % is now owner+admin of their workspace(s).', target_uid;
end $$;
