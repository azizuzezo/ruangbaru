-- =============================================================================
-- RuangBaru Workspace — Database Schema
-- Migration 001: Initial Schema
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PROFILES (extends auth.users)
-- =============================================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- WORKSPACES
-- =============================================================================
CREATE TABLE workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business', 'enterprise')),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- WORKSPACE MEMBERS
-- =============================================================================
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role workspace_role DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- =============================================================================
-- WORKSPACE INVITATIONS
-- =============================================================================
CREATE TABLE workspace_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role workspace_role DEFAULT 'member' NOT NULL,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex') NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PROJECTS
-- =============================================================================
CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');

CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📁',
  status project_status DEFAULT 'active' NOT NULL,
  cover_image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- PROJECT MEMBERS
-- =============================================================================
CREATE TYPE project_role AS ENUM ('lead', 'member', 'viewer');

CREATE TABLE project_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role project_role DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =============================================================================
-- TASKS
-- =============================================================================
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('no_priority', 'urgent', 'high', 'medium', 'low');

CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description JSONB, -- Tiptap JSON content
  description_text TEXT, -- Plain text for search
  status task_status DEFAULT 'todo' NOT NULL,
  priority task_priority DEFAULT 'no_priority' NOT NULL,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  position FLOAT DEFAULT 0,
  estimated_hours NUMERIC(6,2),
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast lookup
CREATE INDEX tasks_project_id_idx ON tasks(project_id);
CREATE INDEX tasks_workspace_id_idx ON tasks(workspace_id);
CREATE INDEX tasks_assignee_id_idx ON tasks(assignee_id);
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_due_date_idx ON tasks(due_date);

-- =============================================================================
-- TASK COMMENTS
-- =============================================================================
CREATE TABLE task_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  body JSONB NOT NULL, -- Tiptap JSON
  body_text TEXT, -- Plain text for notifications
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TASK ATTACHMENTS
-- =============================================================================
CREATE TABLE task_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  name TEXT NOT NULL,
  size_bytes BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- NOTES
-- =============================================================================
CREATE TABLE notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'Untitled',
  content JSONB, -- Tiptap JSON
  content_text TEXT, -- Plain text for search
  icon TEXT DEFAULT '📝',
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ACTIVITY LOGS
-- =============================================================================
CREATE TABLE activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'task.created', 'task.status_changed', 'project.created'
  resource_type TEXT NOT NULL, -- 'task', 'project', 'note', 'member'
  resource_id UUID,
  resource_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX activity_logs_workspace_id_idx ON activity_logs(workspace_id);
CREATE INDEX activity_logs_resource_idx ON activity_logs(resource_type, resource_id);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TYPE notification_type AS ENUM (
  'task_assigned', 'task_comment', 'task_due_soon', 'task_overdue',
  'project_invite', 'workspace_invite', 'mention'
);

CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON notifications(user_id, read);
