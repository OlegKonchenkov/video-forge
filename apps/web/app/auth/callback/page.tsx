'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const nextPath = searchParams.get('next') ?? '/dashboard';
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/dashboard';

  useEffect(() => {
    const supabase = createClient();

    const completeOAuth = async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/login?error=oauth_exchange_failed');
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace(safeNextPath);
        return;
      }

      router.replace('/login?error=oauth_session_missing');
    };

    void completeOAuth();
  }, [code, router, safeNextPath]);

  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center px-6">
      <div className="film-card p-8 text-center w-full max-w-md">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4 text-film-amber" />
        <p className="text-film-cream font-sans text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}
