-- =============================================================================
-- Per-workspace Kanban columns + custom task fields
-- =============================================================================
-- `tasks.status` was a fixed Postgres ENUM (backlog/todo/in_progress/
-- in_review/done/cancelled) shared by every workspace — there was no way
-- for an admin to add a column like "Ready for Review" or remove one they
-- don't use. This migration:
--   1. Converts `tasks.status` from the ENUM to plain TEXT so it can hold
--      any per-workspace column key, without touching any existing data
--      (every current enum value is already valid text).
--   2. Adds `task_statuses` — each workspace's own ordered list of Kanban
--      columns (name, color, position, and an `is_done` flag so dashboard
--      stats can tell which column(s) count as "completed" without
--      hardcoding the string 'done').
--   3. Backfills the original 6 columns into `task_statuses` for every
--      workspace that already exists, and adds a trigger so every future
--      workspace gets the same starting set automatically.
--   4. Adds `task_custom_fields` (admin-defined field definitions per
--      workspace: text/number/date/select) and
--      `task_custom_field_values` (the actual value on a given task).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. tasks.status: ENUM -> TEXT
-- -----------------------------------------------------------------------------
ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tasks ALTER COLUMN status TYPE TEXT USING status::TEXT;
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'todo';
-- The `task_status` enum type itself is left in place (still used by
-- nothing) rather than dropped — dropping a type is the kind of change
-- that's annoying to reverse if something unexpected still references it.

-- -----------------------------------------------------------------------------
-- 2. task_statuses — per-workspace Kanban columns
-- -----------------------------------------------------------------------------
CREATE TABLE task_statuses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL, -- stored in tasks.status; stable even if `name` is renamed
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280' NOT NULL,
  position FLOAT DEFAULT 0 NOT NULL,
  is_done BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, key)
);

CREATE INDEX task_statuses_workspace_id_idx ON task_statuses(workspace_id);

ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view task statuses"
  ON task_statuses FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins manage task statuses"
  ON task_statuses FOR ALL
  USING (is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

-- Backfill: give every existing workspace the same 6 columns tasks already
-- used, in the same order, so nothing changes visually until an admin
-- actually edits their board.
INSERT INTO task_statuses (workspace_id, key, name, color, position, is_done)
SELECT id, 'backlog', 'Backlog', '#9CA3AF', 0, FALSE FROM workspaces
UNION ALL
SELECT id, 'todo', 'Todo', '#0EA5E9', 1, FALSE FROM workspaces
UNION ALL
SELECT id, 'in_progress', 'In Progress', '#F59E0B', 2, FALSE FROM workspaces
UNION ALL
SELECT id, 'in_review', 'Review', '#8B5CF6', 3, FALSE FROM workspaces
UNION ALL
SELECT id, 'done', 'Done', '#10B981', 4, TRUE FROM workspaces
UNION ALL
SELECT id, 'cancelled', 'Cancelled', '#EF4444', 5, FALSE FROM workspaces;

-- New workspaces get the same starting set automatically.
CREATE OR REPLACE FUNCTION seed_default_task_statuses()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_statuses (workspace_id, key, name, color, position, is_done) VALUES
    (NEW.id, 'backlog', 'Backlog', '#9CA3AF', 0, FALSE),
    (NEW.id, 'todo', 'Todo', '#0EA5E9', 1, FALSE),
    (NEW.id, 'in_progress', 'In Progress', '#F59E0B', 2, FALSE),
    (NEW.id, 'in_review', 'Review', '#8B5CF6', 3, FALSE),
    (NEW.id, 'done', 'Done', '#10B981', 4, TRUE),
    (NEW.id, 'cancelled', 'Cancelled', '#EF4444', 5, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_seed_task_statuses
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION seed_default_task_statuses();

-- -----------------------------------------------------------------------------
-- 3. task_custom_fields — admin-defined field definitions per workspace
-- -----------------------------------------------------------------------------
CREATE TABLE task_custom_fields (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select')),
  options JSONB DEFAULT '[]', -- array of strings, only meaningful for 'select'
  position FLOAT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX task_custom_fields_workspace_id_idx ON task_custom_fields(workspace_id);

ALTER TABLE task_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custom fields"
  ON task_custom_fields FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins manage custom fields"
  ON task_custom_fields FOR ALL
  USING (is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

-- -----------------------------------------------------------------------------
-- 4. task_custom_field_values — the value of one field on one task
-- -----------------------------------------------------------------------------
CREATE TABLE task_custom_field_values (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  field_id UUID REFERENCES task_custom_fields(id) ON DELETE CASCADE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (task_id, field_id)
);

CREATE INDEX task_custom_field_values_task_id_idx ON task_custom_field_values(task_id);

ALTER TABLE task_custom_field_values ENABLE ROW LEVEL SECURITY;

-- Same access level as editing the task itself (any workspace member) —
-- custom field values are just more task data, not admin-only.
CREATE POLICY "Members can view custom field values"
  ON task_custom_field_values FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid()))
  );

CREATE POLICY "Members can set custom field values"
  ON task_custom_field_values FOR ALL
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid()))
  );

CREATE TRIGGER task_custom_field_values_updated_at
  BEFORE UPDATE ON task_custom_field_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE task_statuses;
