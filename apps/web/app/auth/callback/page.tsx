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

    const completeOAuth = async () => {
      const providerError = searchParams.get('error') || searchParams.get('error_description');
      if (providerError) {
        router.replace('/login?error=oauth_provider_error');
        return;
      }

      const hardRedirect = () => window.location.assign('/dashboard');

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (initialSession) {
        hardRedirect();
        return;
      }

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) return;
        authListener.subscription.unsubscribe();
        hardRedirect();
      });

      setTimeout(async () => {
        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();
        if (retrySession) {
          hardRedirect();
          return;
        }
        router.replace('/login?error=oauth_session_missing');
      }, 2500);
    };

    void completeOAuth();
  }, [router, searchParams]);

  return <CallbackLoading />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
