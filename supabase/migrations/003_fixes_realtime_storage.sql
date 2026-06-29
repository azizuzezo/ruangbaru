-- =============================================================================
-- RuangBaru Workspace — Migration 003
-- Critical RLS fixes, invite-accept RPC, realtime, storage, user_preferences
-- Run AFTER 002_rls_policies.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX: workspace_members INSERT bootstrapping
-- -----------------------------------------------------------------------------
-- The original policy required the caller to already be a workspace admin in
-- order to insert a membership row. That makes it impossible to create the very
-- first membership (the owner adding themselves), because no membership exists
-- yet. We allow a user to self-join a workspace they own, in addition to the
-- admin path. Invited users join via the accept_invitation() RPC below.

DROP POLICY IF EXISTS "Owners/admins can manage members" ON workspace_members;

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

-- -----------------------------------------------------------------------------
-- 2. Invitation acceptance flow
-- -----------------------------------------------------------------------------
-- A SECURITY DEFINER function lets an authenticated user redeem a valid, unused,
-- unexpired invitation token. It validates the email matches the caller, creates
-- the membership, and marks the invitation accepted — all atomically and safely
-- without exposing INSERT-on-arbitrary-membership to the client.

CREATE OR REPLACE FUNCTION accept_invitation(invite_token TEXT)
RETURNS UUID AS $$
DECLARE
  inv RECORD;
  caller_email TEXT;
BEGIN
  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv
  FROM workspace_invitations
  WHERE token = invite_token
  FOR UPDATE;

  IF inv IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation already accepted';
  END IF;
  IF inv.expires_at < NOW() THEN
    RAISE EXCEPTION 'Invitation expired';
  END IF;
  IF lower(inv.email) <> lower(caller_email) THEN
    RAISE EXCEPTION 'Invitation was sent to a different email';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, auth.uid(), inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE workspace_invitations
  SET accepted_at = NOW()
  WHERE id = inv.id;

  RETURN inv.workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow invited users to look up an invitation by its token (needed to render
-- the accept page before they are a member of the workspace).
CREATE POLICY "Invitees can view their invitation by token"
  ON workspace_invitations FOR SELECT
  USING (
    lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- 3. user_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  locale TEXT DEFAULT 'id',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  default_view TEXT DEFAULT 'kanban',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Realtime — add collaborative tables to the supabase_realtime publication
-- -----------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- REPLICA IDENTITY FULL so realtime payloads include old values on UPDATE/DELETE
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE task_comments REPLICA IDENTITY FULL;
ALTER TABLE notes REPLICA IDENTITY FULL;

-- -----------------------------------------------------------------------------
-- 5. Storage buckets + policies
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', TRUE),
  ('covers', 'covers', TRUE),
  ('attachments', 'attachments', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Public read for avatars & covers
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatars', 'covers'));

-- Authenticated users can upload to avatars/covers into a folder named by uid
CREATE POLICY "Users upload own avatar/cover"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('avatars', 'covers')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own avatar/cover"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('avatars', 'covers')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own avatar/cover"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('avatars', 'covers')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Attachments are private; any authenticated user can read/write (app enforces
-- workspace scoping at the task_attachments table level via RLS).
CREATE POLICY "Authenticated read attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- -----------------------------------------------------------------------------
-- 6. Helpful extra indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_parent_idx ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS notes_workspace_idx ON notes(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments(task_id, created_at);

-- Full-text search support for global search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS tasks_title_trgm_idx ON tasks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS notes_title_trgm_idx ON notes USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS projects_name_trgm_idx ON projects USING gin (name gin_trgm_ops);
