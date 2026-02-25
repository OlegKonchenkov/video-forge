'use client';

import { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function CallbackLoading() {
  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center px-6">
      <div className="film-card p-8 text-center w-full max-w-md">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-film-amber" />
        <p className="text-film-cream font-sans text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();

    // Handle OAuth provider errors
    const providerError = searchParams.get('error');
    if (providerError) {
      router.replace('/login?error=oauth_provider_error');
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      router.replace('/login?error=oauth_missing_code');
      return;
    }

    // Exchange the code for a session — createBrowserClient handles PKCE automatically
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace(`/login?error=oauth_exchange_failed&reason=${encodeURIComponent(error.message.slice(0, 180))}`);
        return;
      }
      // Hard redirect so the server-side session cookies are sent on the next request
      window.location.href = '/dashboard';
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CallbackLoading />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
