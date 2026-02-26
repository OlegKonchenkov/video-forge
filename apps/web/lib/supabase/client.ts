import { createBrowserClient } from '@supabase/ssr';

// ─── Dev mock ─────────────────────────────────────────────────────────────────
const DEV_USER = {
  id: 'dev-00000000-0000-0000-0000-000000000000',
  email: 'dev@videoforge.local',
  user_metadata: { full_name: 'Dev User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const DEV_PROFILE = { id: DEV_USER.id, credits: 5, plan: 'free' };

function makeQuery(singleData: unknown = null, listData: unknown[] = []): unknown {
  const self: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'in', 'is', 'gt', 'lt', 'like', 'filter', 'match', 'not', 'or', 'update', 'delete']) {
    // eslint-disable-next-line no-loop-func
    self[m] = () => self;
  }
  self['insert'] = () => self;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  self['single'] = () => Promise.resolve({ data: singleData as any, error: null });
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
      onAuthStateChange: (_event: unknown, _cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Dev mode active — use ⚡ Dev Login button above.' } }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: { message: 'OAuth not available in dev mode.' } }),
      signUp: () => Promise.resolve({ data: { session: null }, error: null }),
    },
    from: (table: string) => {
      const singleData = table === 'profiles' ? DEV_PROFILE : table === 'videos' ? null : null;
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

export function createClient() {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createDevClient() as any;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
