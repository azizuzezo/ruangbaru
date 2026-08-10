-- =============================================================================
-- Per-workspace API keys, so a workspace can connect external tools
-- (Zapier-style automations, custom scripts, internal integrations) to the
-- REST API under /api/v1/*. Only the SHA-256 hash of a key is ever stored —
-- the plaintext key is generated client-side and shown exactly once, the
-- same pattern as GitHub/Stripe personal access tokens. `key_prefix` is a
-- short, non-secret slice kept in plaintext purely so the list UI can show
-- "which key is this" without ever re-displaying the secret.
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_workspace_idx ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins/owner manage keys — a leaked key is workspace-wide access,
-- same trust level as inviting an admin.
CREATE POLICY "Admins can view their workspace's API keys"
  ON api_keys FOR SELECT
  USING (is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can revoke API keys"
  ON api_keys FOR UPDATE
  USING (is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "Admins can delete API keys"
  ON api_keys FOR DELETE
  USING (is_workspace_admin(workspace_id, auth.uid()));
