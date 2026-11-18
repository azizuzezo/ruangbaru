-- =============================================================================
-- Human-friendly task numbers, per workspace (#1, #2, #3 ...).
--
-- Every task gets a `task_number` that is unique inside its workspace and
-- never reused. It is what people say out loud ("cek #42"), what emails and
-- notifications link to (/<slug>/tasks/42), and what the public API returns.
--
-- The number is assigned by a BEFORE INSERT trigger from a per-workspace
-- counter row, so it is race-free (the counter row is locked for the
-- duration of the insert) and cannot be chosen or changed by a client.
-- =============================================================================

-- 1. Counter table. Only the SECURITY DEFINER trigger below touches it, so
--    RLS is on with no policies: clients can neither read nor write it.
CREATE TABLE IF NOT EXISTS workspace_task_counters (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  last_number INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE workspace_task_counters ENABLE ROW LEVEL SECURITY;

-- 2. Column + backfill existing tasks in creation order.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_number INTEGER;

WITH base AS (
  SELECT workspace_id, COALESCE(MAX(task_number), 0) AS start_at
  FROM tasks
  GROUP BY workspace_id
),
numbered AS (
  SELECT t.id,
         b.start_at + ROW_NUMBER() OVER (PARTITION BY t.workspace_id ORDER BY t.created_at, t.id) AS n
  FROM tasks t
  JOIN base b ON b.workspace_id = t.workspace_id
  WHERE t.task_number IS NULL
)
UPDATE tasks t SET task_number = numbered.n
FROM numbered
WHERE t.id = numbered.id;

INSERT INTO workspace_task_counters (workspace_id, last_number)
SELECT workspace_id, MAX(task_number) FROM tasks GROUP BY workspace_id
ON CONFLICT (workspace_id) DO UPDATE
  SET last_number = GREATEST(workspace_task_counters.last_number, EXCLUDED.last_number);

ALTER TABLE tasks ALTER COLUMN task_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_workspace_number_idx ON tasks(workspace_id, task_number);

-- 3. Assign on insert (ignores any client-supplied value).
CREATE OR REPLACE FUNCTION assign_task_number()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_task_counters AS c (workspace_id, last_number)
  VALUES (NEW.workspace_id, 1)
  ON CONFLICT (workspace_id) DO UPDATE SET last_number = c.last_number + 1
  RETURNING c.last_number INTO NEW.task_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tasks_assign_number ON tasks;
CREATE TRIGGER tasks_assign_number
  BEFORE INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION assign_task_number();

-- 4. A task's number is permanent: links in old emails must keep working.
CREATE OR REPLACE FUNCTION keep_task_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.task_number := OLD.task_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tasks_keep_number ON tasks;
CREATE TRIGGER tasks_keep_number
  BEFORE UPDATE OF task_number ON tasks
  FOR EACH ROW EXECUTE FUNCTION keep_task_number();
