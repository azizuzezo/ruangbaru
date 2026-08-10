-- =============================================================================
-- Lets an admin set a default assignee for new tasks in a workspace, so the
-- create-task form pre-fills instead of always starting blank. Purely a
-- convenience default — whoever creates a task can still change it before
-- submitting, and existing tasks are untouched.
-- =============================================================================

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
