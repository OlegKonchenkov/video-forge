'use client';
import { Play, Download, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const statusConfig = {
  queued:     { icon: Clock,       color: 'text-slate-400', label: 'Queued' },
  processing: { icon: Loader2,     color: 'text-accent',    label: 'Processing...' },
  complete:   { icon: CheckCircle, color: 'text-success',   label: 'Ready' },
  failed:     { icon: AlertCircle, color: 'text-danger',    label: 'Failed' },
};

export function VideoCard({ video }: { video: any }) {
  const status = statusConfig[video.status as keyof typeof statusConfig] ?? statusConfig.queued;
  const StatusIcon = status.icon;

  return (
    <div className="glass rounded-2xl overflow-hidden group hover:border-accent/20 transition-all duration-300 hover:-translate-y-0.5">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-card flex items-center justify-center">
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          : <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Play className="w-6 h-6 text-accent" />
            </div>
        }
        {video.status === 'processing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-gradient-to-r from-accent to-cyan animate-pulse" style={{ width: `${video.progress}%` }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm truncate">{video.title}</h3>
          <div className={`flex items-center gap-1 text-xs ${status.color} flex-shrink-0`}>
            <StatusIcon className={`w-3 h-3 ${video.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </div>
        </div>
        <p className="text-xs text-slate-500">{new Date(video.created_at).toLocaleDateString()}</p>

        {video.status === 'complete' && (
          <div className="mt-3 flex gap-2">
            <Link href={`/videos/${video.id}`} className="flex-1 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium text-center hover:bg-accent/20 transition-colors">
              View
            </Link>
            <a href={video.output_url} download className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium hover:bg-white/10 transition-colors">
              <Download className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
