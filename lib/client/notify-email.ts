'use client';

type Kind = 'mention' | 'comment' | 'status';

export interface CollaborationEmailInput {
  workspaceId: string;
  taskId: string;
  recipientIds: string[];
  kind: Kind;
  taskTitle: string;
  detail?: string;
  location?: 'comment' | 'description';
}

/**
 * Fire-and-forget trigger for collaboration emails. Email delivery must never
 * block or break the action the user just performed, so failures are swallowed
 * (the server still logs them). In-app notifications are inserted separately.
 */
export function notifyCollaborationEmail(input: CollaborationEmailInput): void {
  fetch('/api/notifications/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).catch(() => {});
}
