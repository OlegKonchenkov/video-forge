import { createBrowserClient, type CookieOptions } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key: string) {
          if (typeof document === 'undefined') return null;
          const cookies = document.cookie ? document.cookie.split('; ') : [];
          const target = cookies.find((c) => c.startsWith(`${key}=`));
          return target ? decodeURIComponent(target.slice(key.length + 1)) : null;
        },
        set(key: string, value: string, options: CookieOptions) {
          if (typeof document === 'undefined') return;
          let cookie = `${key}=${encodeURIComponent(value)}`;
          cookie += `; Path=${options?.path ?? '/'}`;
          if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
          if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
          if (options?.domain) cookie += `; Domain=${options.domain}`;
          if (options?.secure ?? true) cookie += '; Secure';
          document.cookie = cookie;
        },
        remove(key: string, options: CookieOptions) {
          if (typeof document === 'undefined') return;
          let cookie = `${key}=; Path=${options?.path ?? '/'}; Max-Age=0`;
          if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
          if (options?.domain) cookie += `; Domain=${options.domain}`;
          if (options?.secure ?? true) cookie += '; Secure';
          document.cookie = cookie;
        },
      },
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: true,
      },
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
      },
    }
  );
}
