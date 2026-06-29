-- =============================================================================
-- RuangBaru Workspace — Migration 006
-- Fix: "permission denied for table ..." from the client.
--
-- In Postgres, RLS policies only restrict WHICH ROWS are visible. The role must
-- ALSO hold table-level privileges (GRANT) to run the statement at all. If the
-- anon/authenticated roles lack these grants, every client query fails with
-- "permission denied for table" before RLS is ever evaluated.
--
-- This restores the standard Supabase grants and sets default privileges so
-- future tables are covered too. RLS still enforces row-level access on top.
-- Idempotent. Run once.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Existing objects
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Future objects (so new tables/functions don't hit the same wall)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
