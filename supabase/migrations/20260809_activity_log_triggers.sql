-- =============================================================================
-- Activity log triggers
-- =============================================================================
-- The `activity_logs` table (001_initial_schema.sql) was designed to record
-- what's happening in a workspace, but nothing ever wrote to it — the
-- dashboard's "Aktivitas Tim" feed always showed placeholder demo data
-- because it queried a non-existent `activity_log` (singular) table on top
-- of that. This migration:
--   1. Adds triggers so task/project/member events are actually logged.
--   2. The dashboard-side table-name fix ships in the same commit as this
--      migration (app/(app)/[workspace]/dashboard/page.tsx).
-- =============================================================================

CREATE OR REPLACE FUNCTION log_task_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (workspace_id, user_id, action, resource_type, resource_id, resource_name)
  VALUES (NEW.workspace_id, NEW.created_by, 'task.created', 'task', NEW.id, NEW.title);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_log_created
  AFTER INSERT ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_created();

CREATE OR REPLACE FUNCTION log_task_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO activity_logs (workspace_id, user_id, action, resource_type, resource_id, resource_name, metadata)
    VALUES (
      NEW.workspace_id, NEW.assignee_id, 'task.status_changed', 'task', NEW.id, NEW.title,
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_log_status_changed
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_status_changed();

CREATE OR REPLACE FUNCTION log_project_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (workspace_id, user_id, action, resource_type, resource_id, resource_name)
  VALUES (NEW.workspace_id, NEW.created_by, 'project.created', 'project', NEW.id, NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_log_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION log_project_created();

CREATE OR REPLACE FUNCTION log_member_joined()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (workspace_id, user_id, action, resource_type, resource_id, resource_name)
  VALUES (NEW.workspace_id, NEW.user_id, 'member.joined', 'member', NEW.user_id, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_members_log_joined
  AFTER INSERT ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION log_member_joined();
