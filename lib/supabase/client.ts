import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a dummy client or null during build if env variables are not defined yet
    console.warn("Supabase credentials missing. Returning mock browser client.");
    return {} as any;
  }

  return createBrowserClient(url, key);
}

