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
  const code = searchParams.get('code');
  const providerError = searchParams.get('error') || searchParams.get('error_description');

  useEffect(() => {
    const supabase = createClient();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    const hardRedirectToDashboard = () => {
      window.location.assign('/dashboard');
    };

    const fail = (type: string) => {
      router.replace(`/login?error=${encodeURIComponent(type)}`);
    };

    const completeOAuth = async () => {
      if (providerError) {
        fail('oauth_provider_error');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        hardRedirectToDashboard();
        return;
      }

      // If session isn't ready yet and we have an auth code, complete the PKCE exchange once.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // In some cases the code has already been consumed by auto-detection.
          // Re-check session before declaring failure.
          const {
            data: { session: postExchangeSession },
          } = await supabase.auth.getSession();
          if (postExchangeSession) {
            hardRedirectToDashboard();
            return;
          }
        } else {
          hardRedirectToDashboard();
          return;
        }
      }

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        if (!currentSession) return;

        if (timeoutId) clearTimeout(timeoutId);
        if (unsubscribe) unsubscribe();
        hardRedirectToDashboard();
      });
      unsubscribe = () => authListener.subscription.unsubscribe();

      // Give cookie/local storage sync a brief moment before failing the flow.
      timeoutId = setTimeout(async () => {
        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();

        if (retrySession) {
          hardRedirectToDashboard();
          return;
        }

        fail('oauth_session_missing');
      }, 1500);
    };

    void completeOAuth();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, [code, providerError, router]);

  return <CallbackLoading />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
