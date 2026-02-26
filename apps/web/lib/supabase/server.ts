import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─── Dev mock ─────────────────────────────────────────────────────────────────
// When DEV_BYPASS_AUTH=true, return a fake client so all server components work
// without real Supabase credentials. Remove once you have real keys.

const DEV_USER = {
  id: 'dev-00000000-0000-0000-0000-000000000000',
  email: 'dev@videoforge.local',
  user_metadata: { full_name: 'Dev User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const DEV_PROFILE = { id: DEV_USER.id, credits: 5, plan: 'free' };

/** Returns a chainable query-builder proxy that resolves to empty data. */
function makeQuery(singleData: unknown = null, listData: unknown[] = []): unknown {
  const self: Record<string, unknown> = {};

  // All chaining methods just return `self`
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'in', 'is', 'gt', 'lt', 'like', 'ilike', 'filter', 'range', 'match', 'not', 'or', 'and', 'update', 'delete']) {
    // eslint-disable-next-line no-loop-func
    self[m] = () => self;
  }

  // .insert() should return same chain (select/single can follow)
  self['insert'] = () => self;

  // .single() resolves immediately to singleData
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  self['single'] = () => Promise.resolve({ data: singleData as any, error: null });

  // Make the builder itself thenable (so `await supabase.from(...).select().eq()...` works)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  self['then'] = (resolve: (v: { data: any; error: null }) => unknown) =>
    Promise.resolve({ data: listData, error: null }).then(resolve as unknown as (v: unknown) => unknown);

  return self;
}

function createDevClient() {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: DEV_USER }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: (table: string) => {
      // Return appropriate mock data per table
      const singleData =
        table === 'profiles' ? DEV_PROFILE :
        table === 'videos'   ? null :
        null;
      return makeQuery(singleData, []);
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function createClient() {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createDevClient() as any;
  }

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        },
      },
    }
  );
}
