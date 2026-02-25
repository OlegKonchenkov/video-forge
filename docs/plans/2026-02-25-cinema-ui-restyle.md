# Cinema UI Restyle — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the homepage film-noir/cinema design system (amber, film-black, Syne/Bebas fonts, film-card borders) consistently to all auth pages (login, signup) and all app interior pages (sidebar, dashboard, billing, video card).

**Architecture:** Pure CSS/Tailwind token swap + component rewrites. No new dependencies. All cinema tokens already exist in `tailwind.config.ts` and `globals.css`. The legacy "blue SaaS" tokens (`bg`, `bg-card`, `accent`, `cyan`, `.glass`, `.gradient-text`, `.glow-blue`) are replaced with film palette tokens throughout the app shell.

**Tech Stack:** Next.js 14 App Router · Tailwind CSS · globals.css utility classes (`.btn-amber`, `.btn-ghost`, `.film-card`, `.section-label`)

---

## Design Token Reference

```
bg-film-black   #080808   ← page/sidebar backgrounds
bg-film-warm    #141209   ← subtle panels, credits badge
bg-film-card    #0F0E0A   ← card backgrounds
border-film-border #2A2218 ← all borders (replaces border-white/10)
text-film-amber #E8C547   ← primary accent (replaces text-accent / blue)
text-film-cream #F0EBE1   ← primary text
text-film-gray  #7A746E   ← muted text (replaces text-slate-400/500)
text-film-gray-light #B0A89E ← slightly brighter muted

font-display  → Bebas Neue  (big display headlines)
font-sans     → Syne        (UI text, buttons, labels)
font-serif    → DM Serif Display (italic subtitles)

.btn-amber    amber fill, black text, uppercase Syne
.btn-ghost    transparent, cream text, film-border, hover→amber
.film-card    bg-film-card + border-film-border
.section-label amber uppercase 0.65rem tracking-widest Syne
```

---

## Task 1: Auth Layout — amber glow, remove blue tint

**Files:**
- Modify: `apps/web/app/(auth)/layout.tsx`

**Step 1: Replace the file content**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center px-6 relative overflow-hidden">
      {/* Amber radial glow */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,197,71,0.07) 0%, transparent 65%)' }}
      />
      {/* Left vertical rule — desktop only */}
      <div className="hidden md:block absolute left-14 top-16 bottom-16 w-px bg-film-border" aria-hidden />
      {children}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add apps/web/app/\(auth\)/layout.tsx
git commit -m "style: auth layout — amber radial glow, film-black bg"
```

---

## Task 2: Login page — full cinema restyle

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx`

**Step 1: Replace the file content**

```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SPROCKETS = Array.from({ length: 18 });

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
  }

  async function handleGoogleLogin() {
    setOauthLoading(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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

        {/* Section label badge */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-px w-8 bg-film-amber" />
          <span className="section-label">Now Screening</span>
          <span className="h-px w-8 bg-film-amber" />
        </div>

        <h1 className="font-display text-4xl tracking-wider text-film-cream mb-1">WELCOME BACK</h1>
        <p className="font-serif italic text-film-gray-light text-sm">Sign in to your VideoForge account</p>
      </div>

      {/* Card */}
      <div className="film-card p-8 space-y-5">
        {error && (
          <div className="p-3 border border-red-800/50 bg-red-950/30 text-red-400 text-sm font-sans">
            {error}
          </div>
        )}

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
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
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-film-border" />
          <span className="text-film-gray text-xs font-sans tracking-widest uppercase">or</span>
          <div className="flex-1 h-px bg-film-border" />
        </div>

        {/* Email / Password */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@company.com"
              className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Your password"
              className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
            />
          </div>

          <button
            type="submit" disabled={loading || oauthLoading}
            className="btn-amber w-full justify-center disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '→ Sign In'}
          </button>
        </form>

        {/* Mini film strip */}
        <div className="pt-2 border-t border-film-border -mx-8 px-0">
          <div className="flex items-center gap-1.5 px-4 py-1.5 overflow-hidden">
            {SPROCKETS.map((_, i) => (
              <div key={i} className="w-6 h-4 flex-shrink-0 border border-film-border/60 bg-film-black flex items-end p-0.5">
                <span className="font-display text-film-amber/20 text-[0.4rem] leading-none">{String(i + 1).padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-film-gray mt-5 font-sans tracking-wide">
        No account?{' '}
        <Link href="/signup" className="link-amber text-film-amber">Sign up free</Link>
      </p>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add apps/web/app/\(auth\)/login/page.tsx
git commit -m "style: login page — cinema restyle with amber, film-card, film strip"
```

---

## Task 3: Signup page — full cinema restyle

**Files:**
- Modify: `apps/web/app/(auth)/signup/page.tsx`

**Step 1: Replace the file content**

```tsx
'use client';
import { useState } from 'react';
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

  async function handleGoogleSignup() {
    setOauthLoading(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
        <p className="font-serif italic text-film-gray-light text-sm">Start with 1 free video — no card needed</p>
      </div>

      {/* Card */}
      <div className="film-card p-8 space-y-5">
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '→ Create Account'}
          </button>
        </form>

        {/* Mini film strip */}
        <div className="pt-2 border-t border-film-border -mx-8 px-0">
          <div className="flex items-center gap-1.5 px-4 py-1.5 overflow-hidden">
            {SPROCKETS.map((_, i) => (
              <div key={i} className="w-6 h-4 flex-shrink-0 border border-film-border/60 bg-film-black flex items-end p-0.5">
                <span className="font-display text-film-amber/20 text-[0.4rem] leading-none">{String(i + 1).padStart(2, '0')}</span>
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
```

**Step 2: Commit**
```bash
git add apps/web/app/\(auth\)/signup/page.tsx
git commit -m "style: signup page — cinema restyle with amber, film-card, film strip"
```

---

## Task 4: Sidebar — film-black, amber accents

**Files:**
- Modify: `apps/web/components/app/Sidebar.tsx`

**Step 1: Replace the file content**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, CreditCard, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/videos/new', icon: PlusCircle,      label: 'New Video' },
  { href: '/billing',   icon: CreditCard,       label: 'Billing' },
  { href: '/settings',  icon: Settings,         label: 'Settings' },
];

export function Sidebar({ credits }: { credits: number }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-[#0A0A0A] border-r border-film-border">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-film-border">
        <Link href="/dashboard" className="inline-flex items-baseline gap-0.5">
          <span className="font-display text-xl tracking-wider text-film-cream">VIDEO</span>
          <span className="font-display text-xl tracking-wider text-film-amber">FORGE</span>
        </Link>
      </div>

      {/* Credits badge */}
      <div className="mx-4 mt-5 p-4 bg-film-warm border border-film-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.6rem] font-sans font-bold tracking-widest uppercase text-film-gray">Credits</span>
          <Link href="/billing" className="text-[0.6rem] font-sans font-bold tracking-wider uppercase text-film-amber hover:text-film-amber-dim transition-colors link-amber">
            Buy more
          </Link>
        </div>
        <div className="text-2xl font-display tracking-wide text-film-cream">{credits}</div>
        <div className="mt-2 h-0.5 bg-film-border overflow-hidden">
          <div
            className="h-full bg-film-amber transition-all duration-500"
            style={{ width: `${Math.min(credits * 10, 100)}%` }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-sans font-medium transition-all duration-150 border-l-2 ${
                active
                  ? 'border-film-amber text-film-amber bg-film-warm'
                  : 'border-transparent text-film-gray hover:text-film-cream hover:bg-film-warm/60'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5 border-t border-film-border pt-4">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-sans font-medium text-film-gray hover:text-film-cream hover:bg-film-warm/60 transition-all duration-150 border-l-2 border-transparent"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

**Step 2: Commit**
```bash
git add apps/web/components/app/Sidebar.tsx
git commit -m "style: sidebar — film-black bg, amber active state, amber credits bar"
```

---

## Task 5: VideoCard — film-card style

**Files:**
- Modify: `apps/web/components/app/VideoCard.tsx`

**Step 1: Replace the file content**

```tsx
'use client';
import { Play, Download, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const statusConfig = {
  queued:     { icon: Clock,        color: 'text-film-gray-light', label: 'Queued' },
  processing: { icon: Loader2,      color: 'text-film-amber',      label: 'Processing...' },
  complete:   { icon: CheckCircle,  color: 'text-green-500',       label: 'Ready' },
  failed:     { icon: AlertCircle,  color: 'text-red-500',         label: 'Failed' },
};

export function VideoCard({ video }: { video: any }) {
  const status = statusConfig[video.status as keyof typeof statusConfig] ?? statusConfig.queued;
  const StatusIcon = status.icon;

  return (
    <div className="film-card overflow-hidden group hover:border-film-amber/40 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-film-warm flex items-center justify-center">
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          : (
            <div className="flex flex-col items-center gap-2 text-film-gray">
              <Play className="w-8 h-8 text-film-amber/40" />
            </div>
          )
        }
        {video.status === 'processing' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-film-border">
            <div
              className="h-full bg-film-amber transition-all duration-500"
              style={{ width: `${video.progress ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-t border-film-border">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-sans font-semibold text-sm text-film-cream truncate">{video.title}</h3>
          <div className={`flex items-center gap-1 text-xs font-sans flex-shrink-0 ${status.color}`}>
            <StatusIcon className={`w-3 h-3 ${video.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </div>
        </div>
        <p className="text-[0.7rem] font-sans text-film-gray tracking-wide">
          {new Date(video.created_at).toLocaleDateString()}
        </p>

        {video.status === 'complete' && (
          <div className="mt-3 flex gap-2">
            <Link
              href={`/videos/${video.id}`}
              className="flex-1 py-2 text-center text-xs font-sans font-semibold tracking-wider uppercase text-film-amber border border-film-amber/30 hover:bg-film-amber/10 transition-colors"
            >
              View
            </Link>
            <a
              href={video.output_url} download
              className="flex items-center gap-1 px-3 py-2 text-xs font-sans font-medium text-film-gray border border-film-border hover:border-film-amber/30 hover:text-film-cream transition-colors"
            >
              <Download className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add apps/web/components/app/VideoCard.tsx
git commit -m "style: VideoCard — film-card border, amber accent, no glassmorphism"
```

---

## Task 6: Dashboard page — amber CTA, film-card empty state

**Files:**
- Modify: `apps/web/app/(app)/dashboard/page.tsx`

**Step 1: Replace the file content**

```tsx
import { createClient } from '@/lib/supabase/server';
import { VideoCard } from '@/components/app/VideoCard';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 border-b border-film-border pb-6">
        <div>
          <span className="section-label mb-2 block">Your Studio</span>
          <h1 className="font-display text-4xl tracking-wider text-film-cream">YOUR VIDEOS</h1>
          <p className="text-film-gray font-sans text-sm mt-1">
            {videos?.length ?? 0} video{videos?.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <Link href="/videos/new" className="btn-amber">
          <PlusCircle className="w-4 h-4" />
          New Video
        </Link>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="film-card p-16 text-center">
          <div className="w-14 h-14 mx-auto border border-film-amber/30 flex items-center justify-center mb-5 text-film-amber text-3xl font-display">
            ▶
          </div>
          <h3 className="font-display text-2xl tracking-wider text-film-cream mb-2">LIGHTS, CAMERA…</h3>
          <p className="text-film-gray font-sans text-sm mb-7 font-serif italic">Create your first AI video in under 5 minutes</p>
          <Link href="/videos/new" className="btn-amber">
            → Create First Video
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {videos.map((video) => <VideoCard key={video.id} video={video} />)}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add apps/web/app/\(app\)/dashboard/page.tsx
git commit -m "style: dashboard — amber CTA, film-card empty state, section-label header"
```

---

## Task 7: Billing page — full amber restyle

**Files:**
- Modify: `apps/web/app/(app)/billing/page.tsx`

**Step 1: Replace the PLANS array and all JSX**

Replace the `PLANS` array colors and every UI class. Key changes:
- All `glass rounded-2xl` → `film-card`
- All `from-blue-500 to-cyan-500` / `from-blue-600 to-cyan-500` → `bg-film-amber text-film-black`
- All plan `color`/`bg`/`border` fields → unified amber
- Credits bar → `bg-film-amber`
- Popular badge → amber
- Check icons → `text-film-amber`
- Buttons → `.btn-amber` (popular) or `.btn-ghost` (others)

**Complete replacement:**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'STARTER',
    price: 29,
    credits: 5,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? '',
    features: ['5 AI videos / month', 'All input types', '1080p HD', 'Email support'],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 79,
    credits: 20,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    popular: true,
    features: ['20 AI videos / month', 'Priority rendering', '4K output', 'Custom branding', 'Priority support'],
  },
  {
    id: 'agency',
    name: 'AGENCY',
    price: 199,
    credits: 60,
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID ?? '',
    features: ['60 AI videos / month', 'Batch processing', 'API access', 'Dedicated support', 'White-label'],
  },
];

export default function BillingPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [profile, setProfile] = useState<{ credits: number; plan: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCheckout(priceId: string, planId: string) {
    if (!priceId) { alert('Stripe price ID not configured.'); return; }
    setCheckoutLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user?.id }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: unknown) {
      alert('Checkout failed: ' + (err as Error).message);
      setCheckoutLoading(null);
    }
  }

  async function handleBuyCredits() {
    setCheckoutLoading('credits');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID,
          userId: user?.id,
          mode: 'payment',
          quantity: 1,
        }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: unknown) {
      alert('Checkout failed: ' + (err as Error).message);
      setCheckoutLoading(null);
    }
  }

  const currentPlan = PLANS.find(p => p.id === profile?.plan) ?? null;
  const creditsPercent = currentPlan
    ? Math.round(((profile?.credits ?? 0) / currentPlan.credits) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

      {/* Header */}
      <div className="border-b border-film-border pb-6">
        <span className="section-label mb-2 block">Account</span>
        <h1 className="font-display text-4xl tracking-wider text-film-cream">BILLING</h1>
        <p className="text-film-gray font-sans text-sm mt-1">Manage your plan and credits</p>
      </div>

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="film-card p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[0.6rem] font-sans font-bold tracking-widest uppercase text-film-gray mb-1">Current Plan</p>
            {loading ? (
              <div className="h-8 w-32 bg-film-warm animate-pulse" />
            ) : (
              <span className="font-display text-3xl tracking-wider text-film-cream capitalize">
                {profile?.plan ?? 'Free'}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[0.6rem] font-sans font-bold tracking-widest uppercase text-film-gray mb-1">Credits Remaining</p>
            {loading ? (
              <div className="h-8 w-20 bg-film-warm animate-pulse" />
            ) : (
              <span className="font-display text-3xl tracking-wider text-film-amber">{profile?.credits ?? 0}</span>
            )}
          </div>
        </div>

        {!loading && currentPlan && (
          <div className="mt-4">
            <div className="flex justify-between text-[0.65rem] font-sans text-film-gray mb-1">
              <span>{profile?.credits} remaining</span>
              <span>{currentPlan.credits} / month</span>
            </div>
            <div className="h-0.5 bg-film-border overflow-hidden">
              <div className="h-full bg-film-amber transition-all" style={{ width: `${creditsPercent}%` }} />
            </div>
          </div>
        )}

        {/* One-off credits */}
        <div className="mt-6 flex items-center justify-between p-4 bg-film-warm border border-film-border">
          <div>
            <p className="text-film-cream font-sans text-sm font-medium">Need more videos now?</p>
            <p className="text-film-gray font-sans text-xs mt-0.5">Buy 1 video credit for $9 — no subscription</p>
          </div>
          <button
            onClick={handleBuyCredits}
            disabled={checkoutLoading === 'credits'}
            className="btn-ghost !py-2 !px-4 !text-[0.7rem] disabled:opacity-40"
          >
            {checkoutLoading === 'credits' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5" />
            )}
            Buy Credit
          </button>
        </div>
      </motion.div>

      {/* Plans */}
      <div>
        <span className="section-label mb-4 block">Upgrade Your Plan</span>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrent = profile?.plan === plan.id;
            const isLoading = checkoutLoading === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative film-card p-6 ${plan.popular ? 'border-film-amber/50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-[0.6rem] font-sans font-bold tracking-widest uppercase bg-film-amber text-film-black">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 text-[0.6rem] font-sans font-bold tracking-widest uppercase bg-film-warm border border-film-amber/40 text-film-amber">
                      Current
                    </span>
                  </div>
                )}

                <h3 className="font-display text-2xl tracking-wider text-film-cream">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-5">
                  <span className="font-display text-4xl tracking-wide text-film-amber">${plan.price}</span>
                  <span className="text-film-gray font-sans text-xs">/month</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs font-sans text-film-gray-light">
                      <CheckCircle className="w-3.5 h-3.5 text-film-amber flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && handleCheckout(plan.priceId, plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'btn-ghost !cursor-default opacity-40'
                      : plan.popular
                      ? 'btn-amber'
                      : 'btn-ghost'
                  } disabled:opacity-40`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current plan'
                  ) : (
                    <>Upgrade <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="film-card p-6">
        <span className="section-label mb-4 block">Billing FAQ</span>
        <div className="space-y-5 text-sm font-sans">
          {[
            { q: 'When are credits reset?', a: 'Credits reset on your billing cycle anniversary each month.' },
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel from this page and you keep access until your billing period ends.' },
            { q: 'Do unused credits roll over?', a: 'No — credits reset each cycle. Buy one-off credits for occasional extra use.' },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-film-border pb-5 last:border-0 last:pb-0">
              <p className="text-film-cream font-semibold mb-1">{q}</p>
              <p className="text-film-gray">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add apps/web/app/\(app\)/billing/page.tsx
git commit -m "style: billing page — full amber cinema restyle, film-card throughout"
```

---

## Task 8: TypeScript check + final commit

**Step 1: Run TS check**
```bash
cd apps/web && npx tsc --noEmit
```
Expected: zero output (clean). Fix any type errors before continuing.

**Step 2: Final summary commit (if any fixups were needed)**
```bash
git add -A
git commit -m "fix: TS cleanup after cinema UI restyle"
```

---

## Done ✓

All blue/glassmorphism references replaced with the cinema design system. The app now reads as one continuous brand from the landing page through auth into the dashboard.
