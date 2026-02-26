import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/app/Sidebar';
import { cookies } from 'next/headers';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // ── Dev bypass ────────────────────────────────────────────────────────────
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    const cookieStore = await cookies();
    if (!cookieStore.has('dev_session')) redirect('/login');

    return (
      <div className="flex min-h-screen">
        <Sidebar credits={5} userEmail="dev@videoforge.local" />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    );
  }
  // ── End dev bypass ────────────────────────────────────────────────────────

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex min-h-screen">
      <Sidebar credits={profile?.credits ?? 0} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
