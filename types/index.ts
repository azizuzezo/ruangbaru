// =============================================================================
// Global TypeScript types for RuangBaru Workspace
// =============================================================================

export type WorkspacePlan = 'free' | 'pro' | 'business' | 'enterprise';
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectRole = 'lead' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'no_priority' | 'urgent' | 'high' | 'medium' | 'low';
export type NotificationType =
  | 'task_assigned'
  | 'task_comment'
  | 'task_due_soon'
  | 'task_overdue'
  | 'project_invite'
  | 'workspace_invite'
  | 'mention';

// =============================================================================
// Database row types (match Supabase schema)
// =============================================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  plan: WorkspacePlan;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  profile?: Profile;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  inviter?: Profile;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  status: ProjectStatus;
  cover_image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined fields
  member_count?: number;
  task_count?: number;
  completed_task_count?: number;
}

export interface Task {
  id: string;
  project_id: string;
  workspace_id: string;
  parent_task_id: string | null;
  title: string;
  description: Record<string, unknown> | null; // Tiptap JSON
  description_text: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string | null;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  estimated_hours: number | null;
  labels: string[];
  created_at: string;
  updated_at: string;
  // joined fields
  assignee?: Profile;
  creator?: Profile;
  project?: Project;
  subtasks?: Task[];
  comment_count?: number;
  attachment_count?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  body: Record<string, unknown>; // Tiptap JSON
  body_text: string | null;
  created_at: string;
  updated_at: string;
  user?: Profile;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  storage_path: string;
  name: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  uploader?: Profile;
}

export interface Note {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  content: Record<string, unknown> | null; // Tiptap JSON
  content_text: string | null;
  icon: string;
  cover_image_url: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface ActivityLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  actor_id: string | null;
  workspace_id: string | null;
  created_at: string;
  actor?: Profile;
}

export type MeetingStatus = 'scheduled' | 'live' | 'ended';

export interface Meeting {
  id: string;
  workspace_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  room_name: string;
  status: MeetingStatus;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_by: string | null;
  created_at: string;
  // joined fields
  creator?: Profile;
  participants?: MeetingParticipant[];
  participant_count?: number;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  role: 'host' | 'participant';
  invited: boolean;
  joined_at: string | null;
  left_at: string | null;
  profile?: Profile;
}

// =============================================================================
// UI / App types
// =============================================================================

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  isActive?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'timeline';

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}
