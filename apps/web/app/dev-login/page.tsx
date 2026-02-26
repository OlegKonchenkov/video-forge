'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * DEV ONLY — sets a dev_session cookie and redirects to /dashboard.
 * This page is only useful when DEV_BYPASS_AUTH=true in .env.local.
 */
export default function DevLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Set a 24h dev session cookie
    const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
    document.cookie = `dev_session=true; expires=${expires}; path=/`;
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-6 h-6 text-film-amber animate-spin mx-auto" />
        <p className="text-film-gray font-sans text-sm">Starting dev session…</p>
      </div>
    </div>
  );
}
