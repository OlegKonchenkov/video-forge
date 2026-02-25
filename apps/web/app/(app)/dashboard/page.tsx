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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black">Your Videos</h1>
          <p className="text-slate-400 mt-1">{videos?.length ?? 0} videos generated</p>
        </div>
        <Link href="/videos/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-semibold hover:opacity-90 transition-all glow-blue">
          <PlusCircle className="w-4 h-4" />
          New Video
        </Link>
      </div>

      {!videos || videos.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
            <PlusCircle className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-bold mb-2">No videos yet</h3>
          <p className="text-slate-400 mb-6">Create your first video in minutes</p>
          <Link href="/videos/new" className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-semibold hover:opacity-90 transition-all glow-blue">
            Create First Video →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {videos.map((video) => <VideoCard key={video.id} video={video} />)}
        </div>
      )}
    </div>
  );
}
