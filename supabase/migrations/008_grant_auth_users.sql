-- =============================================================================
-- Migration 008: Fix "permission denied for table users"
-- =============================================================================
-- When PostgREST resolves a FK join like `inviter:profiles(*)`, it traverses
-- the full FK chain: workspace_invitations.invited_by → profiles.id → auth.users.id
-- The authenticated role has no USAGE on the auth schema, so Postgres rejects
-- the traversal with "permission denied for table users".
--
-- Fix: grant the minimum necessary access to auth schema objects.
-- =============================================================================

GRANT USAGE ON SCHEMA auth TO anon, authenticated;

-- Read-only access to auth.users — PostgREST needs this to resolve FK paths
-- that originate from profiles (which references auth.users).
-- RLS on public tables still controls what data is actually returned.
GRANT SELECT ON auth.users TO anon, authenticated;
