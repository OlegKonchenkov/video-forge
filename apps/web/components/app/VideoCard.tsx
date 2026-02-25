'use client';
import { Play, Download, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const statusConfig = {
  queued:     { icon: Clock,        color: 'text-film-gray-light', label: 'Queued' },
  processing: { icon: Loader2,      color: 'text-film-amber',      label: 'Processing...' },
  complete:   { icon: CheckCircle,  color: 'text-green-500',       label: 'Ready' },
  failed:     { icon: AlertCircle,  color: 'text-red-500',         label: 'Failed' },
};

export function VideoCard({ video }: { video: any }) {
  const status = statusConfig[video.status as keyof typeof statusConfig] ?? statusConfig.queued;
  const StatusIcon = status.icon;

  return (
    <div className="film-card overflow-hidden group hover:border-film-amber/40 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-film-warm flex items-center justify-center">
        {video.thumbnail_url
          ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
          : (
            <div className="flex flex-col items-center gap-2 text-film-gray">
              <Play className="w-8 h-8 text-film-amber/40" />
            </div>
          )
        }
        {video.status === 'processing' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-film-border">
            <div
              className="h-full bg-film-amber transition-all duration-500"
              style={{ width: `${video.progress ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-t border-film-border">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-sans font-semibold text-sm text-film-cream truncate">{video.title}</h3>
          <div className={`flex items-center gap-1 text-xs font-sans flex-shrink-0 ${status.color}`}>
            <StatusIcon className={`w-3 h-3 ${video.status === 'processing' ? 'animate-spin' : ''}`} />
            {status.label}
          </div>
        </div>
        <p className="text-[0.7rem] font-sans text-film-gray tracking-wide">
          {new Date(video.created_at).toLocaleDateString()}
        </p>

        {video.status === 'complete' && (
          <div className="mt-3 flex gap-2">
            <Link
              href={`/videos/${video.id}`}
              className="flex-1 py-2 text-center text-xs font-sans font-semibold tracking-wider uppercase text-film-amber border border-film-amber/30 hover:bg-film-amber/10 transition-colors"
            >
              View
            </Link>
            <a
              href={video.output_url} download
              className="flex items-center gap-1 px-3 py-2 text-xs font-sans font-medium text-film-gray border border-film-border hover:border-film-amber/30 hover:text-film-cream transition-colors"
            >
              <Download className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
