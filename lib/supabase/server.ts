import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const CONFIG_ERROR = {
  message: 'Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local.',
};

/**
 * A chainable PostgREST-style builder mock (`.from(table).select(...).eq(...)`
 * etc.) that always resolves to `{ data: null, error: CONFIG_ERROR }`.
 *
 * Must NOT expose a real `.then` via the catch-all Proxy trap below — doing
 * that turns the object into an accidental "thenable," and anything that
 * `await`s it (including this file's own `createClient()`, since it's an
 * `async function`) will call `.then(resolve, reject)` on it. If that call
 * doesn't invoke `resolve`/`reject`, the await never settles — it just
 * hangs forever with no error and no timeout. That was the actual bug:
 * every server action calling `await createClient()` silently hung when
 * Supabase env vars were missing, instead of failing fast.
 */
function mockTable(): any {
  const result = { data: null, error: CONFIG_ERROR };
  const settled = {
    then(onFulfilled?: (v: typeof result) => any, onRejected?: (e: unknown) => any) {
      try {
        return Promise.resolve(onFulfilled ? onFulfilled(result) : result);
      } catch (e) {
        return onRejected ? Promise.resolve(onRejected(e)) : Promise.reject(e);
      }
    },
    catch(onRejected?: (e: unknown) => any) {
      return Promise.resolve(result).catch(onRejected);
    },
    finally(onFinally?: () => void) {
      onFinally?.();
      return Promise.resolve(result);
    },
  };
  // `builder` is the Proxy's own self-reference, so any chained call
  // (select/eq/single/insert/update/order/limit/...) returns the same
  // awaitable object — the chain can continue arbitrarily deep and still
  // resolve correctly whenever it's finally awaited.
  const builder = new Proxy(settled, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      return () => builder;
    },
  });
  return builder;
}

function mockAuth() {
  const noUser = { data: { user: null }, error: null };
  return {
    getUser: async () => noUser,
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: CONFIG_ERROR }),
    signUp: async () => ({ data: { user: null, session: null }, error: CONFIG_ERROR }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: CONFIG_ERROR }),
    signInWithOAuth: async () => ({ data: { url: null, provider: 'google' }, error: CONFIG_ERROR }),
    exchangeCodeForSession: async () => ({ data: { session: null, user: null }, error: CONFIG_ERROR }),
  };
}

/** Build-safe / misconfigured-env fallback — never crashes, never hangs. */
function mockClient(): any {
  return { auth: mockAuth(), from: () => mockTable() };
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase credentials missing. Returning mock server client.');
    return mockClient();
  }

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
