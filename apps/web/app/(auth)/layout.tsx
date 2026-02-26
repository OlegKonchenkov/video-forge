import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Dev bypass: if dev_session cookie exists, redirect to dashboard
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    const cookieStore = await cookies();
    if (cookieStore.has('dev_session')) {
      redirect('/dashboard');
    }
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center px-6 relative overflow-hidden">
      {/* Amber radial glow */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,197,71,0.07) 0%, transparent 65%)' }}
      />
      {/* Left vertical rule - desktop only */}
      <div className="hidden md:block absolute left-14 top-16 bottom-16 w-px bg-film-border" aria-hidden />
      {children}
    </div>
  );
}
