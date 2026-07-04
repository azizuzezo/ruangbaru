-- =============================================================================
-- Fix: attachments storage bucket had no tenant scoping.
--
-- 003_fixes_realtime_storage.sql granted read/insert on the 'attachments'
-- bucket to ANY authenticated user, on the (incorrect) assumption that
-- workspace scoping was enforced at the task_attachments table level. That
-- table only gates the *metadata* row, not direct storage access — any
-- authenticated user, from any workspace, could list/download/overwrite
-- another tenant's files once uploads were wired up.
--
-- Convention: objects live at "<task_id>/<filename>" in the bucket, so the
-- first path segment lets us join back to tasks -> workspace_id and reuse
-- the existing is_workspace_member()/is_workspace_admin() helpers.
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete attachments" ON storage.objects;

CREATE POLICY "Workspace members read attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

CREATE POLICY "Workspace members upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND is_workspace_member(t.workspace_id, auth.uid())
    )
  );

-- Delete is scoped to the uploader or a workspace admin, via the
-- task_attachments row (which exists by the time a delete is attempted).
CREATE POLICY "Uploader or workspace admin can delete attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND EXISTS (
      SELECT 1 FROM task_attachments ta
      JOIN tasks t ON t.id = ta.task_id
      WHERE ta.storage_path = storage.objects.name
      AND (ta.uploaded_by = auth.uid() OR is_workspace_admin(t.workspace_id, auth.uid()))
    )
  );
