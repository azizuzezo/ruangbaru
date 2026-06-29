-- =============================================================================
-- RuangBaru Workspace — Migration 004
-- Fix: "Database error creating new user" on signup.
--
-- The auth.users INSERT fires on_auth_user_created -> handle_new_user(), which
-- inserts into public.profiles. If that function raises, GoTrue rolls back the
-- whole signup and returns "Database error creating new user".
--
-- Hardened Supabase Postgres runs SECURITY DEFINER functions without `public`
-- on the search_path, so an unqualified `profiles` reference fails to resolve.
-- This migration recreates the function with an explicit search_path, schema-
-- qualified names, conflict-safety, and the required grants.
-- Run AFTER the earlier migrations. Safe to run multiple times.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger to be sure it points at the updated function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- The auth service executes the INSERT as supabase_auth_admin; make sure it can
-- run the trigger function and reach the profiles table.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
GRANT INSERT, SELECT ON TABLE public.profiles TO supabase_auth_admin;
