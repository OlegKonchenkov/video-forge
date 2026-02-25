'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-cyan flex items-center justify-center glow-blue">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-black">Video<span className="gradient-text">Forge</span></span>
        </div>
        <h1 className="text-3xl font-black mb-2">Create your account</h1>
        <p className="text-slate-400">Start with 1 free video — no card needed</p>
      </div>

      <form onSubmit={handleSignup} className="glass rounded-2xl p-8 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold text-lg hover:opacity-90 transition-all duration-200 glow-blue flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account →'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
