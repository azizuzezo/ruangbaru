-- =============================================================================
-- Workspace ownership transfer.
--
-- Problem: "workspaces FOR UPDATE" RLS allows ANY workspace admin to update
-- a workspace row (name/description/slug), which is correct for those
-- columns — but it also technically permits an admin (not just the owner)
-- to overwrite `owner_id` directly and hijack ownership, since RLS is
-- row-level, not column-level. A BEFORE UPDATE trigger closes that gap
-- regardless of which policy let the row-level write through.
-- =============================================================================

CREATE OR REPLACE FUNCTION protect_workspace_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND auth.uid() IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Only the current owner can transfer workspace ownership';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_workspace_owner_id_trigger ON workspaces;
CREATE TRIGGER protect_workspace_owner_id_trigger
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION protect_workspace_owner_id();

-- Convenience RPC for the Settings UI: does all three writes (workspace
-- owner_id + both members' roles) as one atomic, pre-validated operation
-- instead of three separate client round trips that could partially fail.
CREATE OR REPLACE FUNCTION transfer_workspace_ownership(ws_id UUID, new_owner_id UUID)
RETURNS VOID AS $$
DECLARE
  current_owner UUID;
BEGIN
  SELECT owner_id INTO current_owner FROM workspaces WHERE id = ws_id;

  IF current_owner IS NULL THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM current_owner THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF NOT is_workspace_member(ws_id, new_owner_id) THEN
    RAISE EXCEPTION 'The new owner must already be a member of this workspace';
  END IF;

  UPDATE workspaces SET owner_id = new_owner_id WHERE id = ws_id;
  UPDATE workspace_members SET role = 'owner' WHERE workspace_id = ws_id AND user_id = new_owner_id;
  UPDATE workspace_members SET role = 'admin' WHERE workspace_id = ws_id AND user_id = current_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
