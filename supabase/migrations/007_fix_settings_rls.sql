-- =============================================================================
-- Migration 007: Fix settings + billing update permissions
-- =============================================================================
-- Problem: workspace UPDATE policy uses is_workspace_admin(id, auth.uid()) which
-- requires a row in workspace_members with role 'owner' or 'admin'. If a user is
-- the workspace creator (owner_id) but their member row has a different role label,
-- or if the helper function fails, the update is denied.
--
-- Fix: add a separate policy so workspace owners can always update their own workspace.
-- =============================================================================

-- 1. Allow workspace owners to update their own workspace (by owner_id column)
DROP POLICY IF EXISTS "Owners can update their workspace" ON workspaces;
CREATE POLICY "Owners can update their workspace"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 2. Ensure the existing admin policy also has an explicit WITH CHECK clause
--    (DROP + recreate to be safe — was USING only, which PostgreSQL mirrors to WITH CHECK
--    but being explicit avoids ambiguity)
DROP POLICY IF EXISTS "Admins can update workspace settings" ON workspaces;
CREATE POLICY "Admins can update workspace settings"
  ON workspaces FOR UPDATE
  USING (is_workspace_admin(id, auth.uid()))
  WITH CHECK (is_workspace_admin(id, auth.uid()));

-- 3. Profiles: ensure authenticated users can update their own profile row.
--    The original policy from 002 should cover this, but re-assert for safety.
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 4. Make sure profiles SELECT works for self (needed for settings page to display current values)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- 5. Ensure the plan column on workspaces can be updated by service_role (for admin panel)
--    No RLS change needed — service role bypasses RLS by default.
--    Just re-confirm GRANTs for authenticated role on workspaces (idempotent).
GRANT SELECT, INSERT, UPDATE ON workspaces TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;

-- 6. Refresh search path on is_workspace_admin to prevent future privilege issues
ALTER FUNCTION is_workspace_admin(uuid, uuid) SET search_path = public;
ALTER FUNCTION is_workspace_member(uuid, uuid) SET search_path = public;
