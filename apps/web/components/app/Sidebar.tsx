'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PlusCircle, CreditCard, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/videos/new', icon: PlusCircle,      label: 'New Video' },
  { href: '/billing',   icon: CreditCard,       label: 'Billing' },
  { href: '/settings',  icon: Settings,         label: 'Settings' },
];

export function Sidebar({ credits, userEmail }: { credits: number; userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    // Dev bypass: just clear the cookie
    if (process.env.NEXT_PUBLIC_DEV_BYPASS === 'true') {
      document.cookie = 'dev_session=; Max-Age=0; path=/';
      router.push('/');
      return;
    }
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
        {process.env.NEXT_PUBLIC_DEV_BYPASS === 'true' && (
          <div className="mt-1.5 px-1.5 py-0.5 inline-block border border-film-amber/30 bg-film-amber/10">
            <span className="text-[0.55rem] font-sans font-bold tracking-widest uppercase text-film-amber">Dev Mode</span>
          </div>
        )}
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
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
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

      {/* User + Sign out */}
      <div className="px-3 pb-5 border-t border-film-border pt-4">
        {userEmail && (
          <p className="px-3 mb-3 text-[0.65rem] font-sans text-film-gray truncate">{userEmail}</p>
        )}
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
