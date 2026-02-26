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
          <div className="w-14 h-14 mx-auto border border-film-amber/30 flex items-center justify-center mb-5">
            <span className="text-film-amber text-2xl font-display">&#9654;</span>
          </div>
          <h3 className="font-display text-2xl tracking-wider text-film-cream mb-2">LIGHTS, CAMERA...</h3>
          <p className="text-film-gray font-sans text-sm mb-7 font-serif italic">Create your first AI video in under 5 minutes</p>
          <Link href="/videos/new" className="btn-amber">
            Create First Video ->
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
