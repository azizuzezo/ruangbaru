-- =============================================================================
-- Fix: `notifications` has RLS enabled (001/002) but NO INSERT policy was
-- ever added — SELECT/UPDATE/DELETE are scoped to the recipient, but nothing
-- lets one user's client insert a notification row addressed to someone
-- else. Every "notify the other person" flow in the app (task assignment,
-- and now @mention notifications) has been silently failing at the RLS
-- layer: the insert returns an error the calling code never surfaces to the
-- UI, so a task got created/assigned/commented-on successfully while the
-- notification quietly never landed.
--
-- Scope: the actor must be inserting as themselves, and both the actor and
-- the recipient must belong to the stated workspace — this lets teammates
-- notify each other (assignment, @mention) without opening notifications up
-- to spamming arbitrary users outside a shared workspace.
-- =============================================================================

CREATE POLICY "Workspace members can notify teammates"
  ON notifications FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    AND workspace_id IS NOT NULL
    AND is_workspace_member(workspace_id, auth.uid())
    AND is_workspace_member(workspace_id, user_id)
  );
