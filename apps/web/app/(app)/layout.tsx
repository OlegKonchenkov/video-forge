import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/app/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
      <Sidebar credits={profile?.credits ?? 0} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
