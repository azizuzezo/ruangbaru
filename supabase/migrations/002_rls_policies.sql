-- =============================================================================
-- RuangBaru Workspace — Row Level Security Policies
-- Migration 002: RLS Policies
-- Run AFTER 001_initial_schema.sql
-- =============================================================================

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Helper functions
-- =============================================================================

-- Check if user is member of workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get user's workspace role
CREATE OR REPLACE FUNCTION get_workspace_role(ws_id UUID, u_id UUID)
RETURNS workspace_role AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = ws_id AND user_id = u_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is at least admin in workspace
CREATE OR REPLACE FUNCTION is_workspace_admin(ws_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id AND user_id = u_id
    AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- PROFILES policies
-- =============================================================================
CREATE POLICY "Users can view profiles of workspace members"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- =============================================================================
-- WORKSPACES policies
-- =============================================================================
CREATE POLICY "Members can view their workspaces"
  ON workspaces FOR SELECT
  USING (is_workspace_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only owner/admin can update workspace"
  ON workspaces FOR UPDATE
  USING (is_workspace_admin(id, auth.uid()));

CREATE POLICY "Only owner can delete workspace"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- =============================================================================
-- WORKSPACE MEMBERS policies
-- =============================================================================
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Owners/admins can manage members"
  ON workspace_members FOR INSERT
  WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Owners/admins can update member roles"
  ON workspace_members FOR UPDATE
  USING (is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Owners/admins can remove members"
  ON workspace_members FOR DELETE
  USING (
    is_workspace_admin(workspace_id, auth.uid()) OR
    user_id = auth.uid() -- allow self-removal
  );

-- =============================================================================
-- WORKSPACE INVITATIONS policies
-- =============================================================================
CREATE POLICY "Members can view invitations for their workspace"
  ON workspace_invitations FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can delete invitations"
  ON workspace_invitations FOR DELETE
  USING (is_workspace_admin(workspace_id, auth.uid()));

-- =============================================================================
-- PROJECTS policies
-- =============================================================================
CREATE POLICY "Workspace members can view projects"
  ON projects FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can create projects"
  ON projects FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Project members and workspace admins can update projects"
  ON projects FOR UPDATE
  USING (
    is_workspace_admin(workspace_id, auth.uid()) OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = id AND user_id = auth.uid() AND role IN ('lead', 'member')
    )
  );

CREATE POLICY "Workspace admins can delete projects"
  ON projects FOR DELETE
  USING (is_workspace_admin(workspace_id, auth.uid()));

-- =============================================================================
-- PROJECT MEMBERS policies
-- =============================================================================
CREATE POLICY "Workspace members can view project members"
  ON project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_workspace_member(p.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Project leads and workspace admins can manage project members"
  ON project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id AND is_workspace_admin(p.workspace_id, auth.uid())
    )
  );

-- =============================================================================
-- TASKS policies
-- =============================================================================
CREATE POLICY "Workspace members can view tasks"
  ON tasks FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update tasks"
  ON tasks FOR UPDATE
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Task creator and workspace admins can delete tasks"
  ON tasks FOR DELETE
  USING (
    created_by = auth.uid() OR
    is_workspace_admin(workspace_id, auth.uid())
  );

-- =============================================================================
-- TASK COMMENTS policies
-- =============================================================================
CREATE POLICY "Workspace members can view task comments"
  ON task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Workspace members can create task comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Comment authors can update their comments"
  ON task_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Comment authors and workspace admins can delete comments"
  ON task_comments FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_admin(t.workspace_id, auth.uid())
    )
  );

-- =============================================================================
-- TASK ATTACHMENTS policies
-- =============================================================================
CREATE POLICY "Workspace members can view attachments"
  ON task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Workspace members can upload attachments"
  ON task_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Uploader and admins can delete attachments"
  ON task_attachments FOR DELETE
  USING (uploaded_by = auth.uid());

-- =============================================================================
-- NOTES policies
-- =============================================================================
CREATE POLICY "Workspace members can view notes (or public notes)"
  ON notes FOR SELECT
  USING (
    is_public = TRUE OR
    is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "Workspace members can create notes"
  ON notes FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can update notes"
  ON notes FOR UPDATE
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Note creator and admins can delete notes"
  ON notes FOR DELETE
  USING (
    created_by = auth.uid() OR
    is_workspace_admin(workspace_id, auth.uid())
  );

-- =============================================================================
-- ACTIVITY LOGS policies
-- =============================================================================
CREATE POLICY "Workspace members can view activity logs"
  ON activity_logs FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id, auth.uid()));

-- =============================================================================
-- NOTIFICATIONS policies
-- =============================================================================
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications (mark read)"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());
