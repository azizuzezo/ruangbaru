-- =============================================================================
-- Migration 009: Narrow the blanket auth.users grant from 008
-- =============================================================================
-- 008 fixed "permission denied for table users" by granting table-wide SELECT
-- on auth.users to anon and authenticated. That's far broader than the actual
-- need: the real caller is the RLS policy "Invitees can view their invitation
-- by token" on workspace_invitations, whose USING clause runs as the invoking
-- role and does `(SELECT email FROM auth.users WHERE id = auth.uid())`.
--
-- A table-wide grant on auth.users exposes every column — encrypted_password,
-- recovery_token, confirmation_token, phone, banned_until, raw_user_meta_data —
-- to any anon/authenticated role. It's harmless today only because PostgREST
-- doesn't expose the `auth` schema over the API; one schema-exposure
-- misconfiguration away from a full credential-hash leak.
--
-- Fix: replace the inline subquery with a SECURITY DEFINER helper that only
-- ever returns the CALLER's own email (never another user's row), then
-- revoke the table-wide grant.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

DROP POLICY IF EXISTS "Invitees can view their invitation by token" ON workspace_invitations;
CREATE POLICY "Invitees can view their invitation by token"
  ON workspace_invitations FOR SELECT
  USING (lower(email) = lower(public.current_user_email()));

-- accept_invitation() also reads auth.users directly, but it's already
-- SECURITY DEFINER, so it runs with the function owner's privileges, not the
-- caller's — it never depended on this grant.
REVOKE SELECT ON auth.users FROM anon, authenticated;
