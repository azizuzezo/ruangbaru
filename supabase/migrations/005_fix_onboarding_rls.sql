-- =============================================================================
-- RuangBaru Workspace — Migration 005
-- Fix: workspace creation (onboarding) blocked by RLS.
--
-- Two issues:
--  1. `INSERT INTO workspaces ... RETURNING *` is evaluated against the SELECT
--     policy, which required membership the user doesn't have yet at insert time
--     -> the insert errored. Allow the owner to see their own workspace.
--  2. The first workspace_members row (owner self-join) must be insertable.
--
-- Idempotent. Run after the earlier migrations.
-- =============================================================================

-- 1. Workspaces: owner can always see their workspace (fixes RETURNING on insert)
DROP POLICY IF EXISTS "Members can view their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Members and owner can view workspaces" ON workspaces;
CREATE POLICY "Members and owner can view workspaces"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid() OR is_workspace_member(id, auth.uid()));

-- 2. Workspace members: owner can add themselves as the first member
DROP POLICY IF EXISTS "Owners/admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Admins manage members or owner self-join" ON workspace_members;
CREATE POLICY "Admins manage members or owner self-join"
  ON workspace_members FOR INSERT
  WITH CHECK (
    is_workspace_admin(workspace_id, auth.uid())
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_id AND w.owner_id = auth.uid()
      )
    )
  );
