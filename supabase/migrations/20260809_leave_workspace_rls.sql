-- =============================================================================
-- Let a member remove their own membership ("leave workspace").
-- =============================================================================
-- The existing "Owners/admins can remove members" DELETE policy only lets an
-- admin/owner remove *someone else* — a plain member had no RLS path to
-- leave a workspace themselves. This adds that path. Deleting the
-- workspace outright (owner-only) already works via the pre-existing
-- "Only owner can delete workspace" policy — the Settings page's Danger
-- Zone only offers "Leave" to non-owners and "Delete workspace" to the
-- owner, so an owner can never end up leaving their own workspace via this
-- policy and orphaning it.
-- =============================================================================
CREATE POLICY "Members can remove themselves"
  ON workspace_members FOR DELETE
  USING (user_id = auth.uid());
