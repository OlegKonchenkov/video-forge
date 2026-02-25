'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, PlusCircle, CreditCard, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/videos/new', icon: PlusCircle, label: 'New Video' },
  { href: '/billing', icon: CreditCard, label: 'Billing' },
  { href: '/settings', icon: Settings, label: 'Settings' },
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
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-white/5 bg-bg">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-cyan flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold">Video<span className="gradient-text">Forge</span></span>
        </Link>
      </div>

      {/* Credits badge */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-accent/10 border border-accent/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Credits remaining</span>
          <Link href="/billing" className="text-xs text-accent font-bold hover:underline">Buy more</Link>
        </div>
        <div className="mt-1 text-2xl font-black text-white">{credits}</div>
        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-cyan rounded-full" style={{ width: `${Math.min(credits * 10, 100)}%` }} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname === href
                ? 'bg-accent/10 text-accent border border-accent/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-white/5">
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 w-full">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
