import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

function isAppRoute(pathname: string) {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/videos') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/settings')
  );
}

function isAuthRoute(pathname: string) {
  return pathname === '/login' || pathname === '/signup';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── DEV BYPASS ──────────────────────────────────────────────────────────────
  // When DEV_BYPASS_AUTH=true, skip Supabase and use a simple cookie instead.
  // Remove once you have real Supabase credentials configured.
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    const hasDevSession = request.cookies.has('dev_session');
    if (!hasDevSession && isAppRoute(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (hasDevSession && isAuthRoute(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  // ── END DEV BYPASS ──────────────────────────────────────────────────────────

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — important: do NOT add logic between createServerClient and getUser
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && isAppRoute(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$|auth/callback|api/).*)',
  ],
};
