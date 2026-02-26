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
      .then(({ data }: { data: any }) => setVideo(data));

    // Realtime subscription
    const channel = supabase.channel('video-' + params.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${params.id}`,
      }, ({ new: updated }: { new: any }) => setVideo(updated))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.id]);

  if (!video) return (
    <div className="p-8 text-film-gray font-sans text-sm">Loading...</div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

      {/* Header */}
      <div className="border-b border-film-border pb-6">
        <span className="section-label mb-2 block">Your Video</span>
        <h1 className="font-display text-4xl tracking-wider text-film-cream">{video.title}</h1>
      </div>

      {/* Status card — shown while not complete */}
      {video.status !== 'complete' && (
        <div className="film-card p-10 text-center space-y-4">
          {video.status === 'queued' && (
            <>
              <Clock className="w-10 h-10 text-film-gray mx-auto" />
              <p className="font-display text-2xl tracking-wider text-film-cream">Queued</p>
              <p className="text-film-gray font-sans text-sm">Your video will start processing shortly</p>
            </>
          )}
          {video.status === 'processing' && (
            <>
              <Loader2 className="w-10 h-10 text-film-amber mx-auto animate-spin" />
              <p className="font-display text-2xl tracking-wider text-film-cream">
                {video.current_step || 'Processing…'}
              </p>
              <div className="max-w-xs mx-auto">
                <div className="h-0.5 bg-film-border overflow-hidden">
                  <div
                    className="h-full bg-film-amber transition-all duration-1000"
                    style={{ width: `${video.progress}%` }}
                  />
                </div>
                <p className="text-film-gray font-sans text-xs mt-2">{video.progress}% complete</p>
              </div>
            </>
          )}
          {video.status === 'failed' && (
            <>
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="font-display text-2xl tracking-wider text-red-400">Generation Failed</p>
              <p className="text-film-gray font-sans text-sm">{video.error_msg}</p>
            </>
          )}
        </div>
      )}

      {/* Video player — shown when complete */}
      {video.status === 'complete' && video.output_url && (
        <div className="space-y-5">
          <div className="film-card overflow-hidden p-0">
            <video controls className="w-full block" src={video.output_url}>
              Your browser does not support video.
            </video>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-film-amber font-sans text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Ready to use
            </div>
            <a
              href={video.output_url}
              download
              className="btn-amber ml-auto flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
