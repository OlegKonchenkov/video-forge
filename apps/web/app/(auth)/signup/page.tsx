'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SPROCKETS = Array.from({ length: 18 });

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) router.replace('/dashboard');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/dashboard');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.session) {
      router.push('/dashboard');
    } else {
      // Email confirmation required
      setConfirmEmail(true);
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setOauthLoading(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) { setError(error.message); setOauthLoading(false); }
  }

  return (
    <div className="w-full max-w-md z-10">

      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-baseline gap-1 mb-6">
          <span className="font-display text-3xl tracking-wider text-film-cream">VIDEO</span>
          <span className="font-display text-3xl tracking-wider text-film-amber">FORGE</span>
        </Link>

        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-px w-8 bg-film-amber" />
          <span className="section-label">New Account</span>
          <span className="h-px w-8 bg-film-amber" />
        </div>

        <h1 className="font-display text-4xl tracking-wider text-film-cream mb-1">JOIN THE STUDIO</h1>
        <p className="font-serif italic text-film-gray-light text-sm">Start with 1 free video - no card needed</p>
      </div>

      {/* Card */}
      <div className="film-card p-8 space-y-5">
        {confirmEmail && (
          <div className="p-4 border border-film-amber/40 bg-film-amber/10 text-film-cream text-sm font-sans text-center">
            Check your email to confirm your account, then{' '}
            <Link href="/login" className="text-film-amber underline">sign in</Link>.
          </div>
        )}
        {error && (
          <div className="p-3 border border-red-800/50 bg-red-950/30 text-red-400 text-sm font-sans">
            {error}
          </div>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={oauthLoading || loading}
          className="btn-ghost w-full justify-center disabled:opacity-40"
        >
          {oauthLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Sign up with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-film-border" />
          <span className="text-film-gray text-xs font-sans tracking-widest uppercase">or</span>
          <div className="flex-1 h-px bg-film-border" />
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith"
              className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com"
              className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters"
              className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors" />
          </div>

          <button type="submit" disabled={loading || oauthLoading}
            className="btn-amber w-full justify-center disabled:opacity-40">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account ->'}
          </button>
        </form>

        {/* Mini film strip */}
        <div className="pt-2 border-t border-film-border -mx-8 px-0 overflow-hidden" aria-hidden>
          <div className="marquee-track-slow flex gap-0.5 py-1.5 px-0.5">
            {[...SPROCKETS, ...SPROCKETS].map((_, i) => (
              <div key={i} className="w-6 h-4 flex-shrink-0 border border-film-border/60 bg-film-black flex items-end p-0.5">
                <span className="font-display text-film-amber/20 text-[0.4rem] leading-none">{String((i % 18) + 1).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-film-gray mt-5 font-sans tracking-wide">
        Already have an account?{' '}
        <Link href="/login" className="link-amber text-film-amber">Sign in</Link>
      </p>
    </div>
  );
}
