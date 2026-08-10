-- =============================================================================
-- Task collaborators — additional people looped into a specific task,
-- distinct from the single `assignee_id` (the one person responsible).
-- Mirrors the project_members pattern but scoped to a task, and open to any
-- workspace member to add (not admin-only like project collaborators) —
-- looping a teammate into a task is an everyday action, not a structural
-- change to the project.
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

ALTER TABLE task_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view task collaborators"
  ON task_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Workspace members can add task collaborators"
  ON task_collaborators FOR INSERT
  WITH CHECK (
    auth.uid() = added_by AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

-- Whoever added the collaborator, the collaborator themself (self-remove),
-- or a workspace admin can remove the row.
CREATE POLICY "Adder, the collaborator, or an admin can remove"
  ON task_collaborators FOR DELETE
  USING (
    added_by = auth.uid() OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_admin(t.workspace_id, auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS task_collaborators_task_idx ON task_collaborators(task_id);

-- New notification type for "you were added as a collaborator on a task" —
-- distinct from 'task_assigned' (the single responsible person) and
-- 'mention' (tagged inline in text).
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_collaborator';
