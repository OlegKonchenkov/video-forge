'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Download, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react';

export default function VideoPage({ params }: { params: { id: string } }) {
  const [video, setVideo] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    supabase.from('videos').select('*').eq('id', params.id).single()
      .then(({ data }) => setVideo(data));

    // Realtime subscription
    const channel = supabase.channel('video-' + params.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${params.id}`,
      }, ({ new: updated }) => setVideo(updated))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  if (!video) return <div className="p-8 text-slate-400">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-black mb-8">{video.title}</h1>

      {/* Status */}
      {video.status !== 'complete' && (
        <div className="glass rounded-2xl p-8 mb-8 text-center">
          {video.status === 'queued' && (
            <>
              <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-xl font-bold">Queued</p>
              <p className="text-slate-400 mt-1">Your video will start processing shortly</p>
            </>
          )}
          {video.status === 'processing' && (
            <>
              <Loader2 className="w-12 h-12 text-accent mx-auto mb-3 animate-spin" />
              <p className="text-xl font-bold">{video.current_step || 'Processing...'}</p>
              <div className="mt-4 max-w-xs mx-auto h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-cyan rounded-full transition-all duration-1000" style={{ width: `${video.progress}%` }} />
              </div>
              <p className="text-slate-400 mt-2 text-sm">{video.progress}% complete</p>
            </>
          )}
          {video.status === 'failed' && (
            <>
              <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
              <p className="text-xl font-bold text-danger">Generation failed</p>
              <p className="text-slate-400 mt-1 text-sm">{video.error_msg}</p>
            </>
          )}
        </div>
      )}

      {/* Video player */}
      {video.status === 'complete' && video.output_url && (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-white/10 glow-blue">
            <video controls className="w-full" src={video.output_url}>
              Your browser does not support video.
            </video>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Ready to use</span>
            </div>
            <a href={video.output_url} download
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold hover:opacity-90 transition-all glow-blue ml-auto">
              <Download className="w-5 h-5" />
              Download MP4
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
