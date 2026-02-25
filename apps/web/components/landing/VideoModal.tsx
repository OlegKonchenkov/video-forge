'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPROCKETS = Array.from({ length: 50 });

export function VideoModal({ isOpen, onClose }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ── Escape key ───────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  /* ── Auto play / pause / rewind ──────────────────────── */
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isOpen) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
      vid.currentTime = 0;
    }
  }, [isOpen]);

  /* ── Lock body scroll ────────────────────────────────── */
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else        document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 md:p-12"
          onClick={onClose}
          aria-modal="true"
          role="dialog"
          aria-label="Product demo video"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-film-black/95 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl z-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-10 right-0 flex items-center gap-2 text-film-gray hover:text-film-amber transition-colors duration-200"
              aria-label="Close video"
            >
              <X className="w-4 h-4" />
              <span className="font-display text-xs tracking-[0.2em]">CLOSE</span>
            </button>

            {/* Film strip top */}
            <div className="flex items-center gap-2 px-2 pt-2 pb-1.5 bg-film-warm overflow-hidden">
              {SPROCKETS.map((_, i) => (
                <div key={i} className="w-2 h-1.5 flex-shrink-0 bg-film-amber/35 rounded-sm" />
              ))}
            </div>

            {/* Video player */}
            <div className="bg-film-black border-x border-film-border">
              <video
                ref={videoRef}
                src="/demo.mp4"
                controls
                playsInline
                className="w-full aspect-video block"
              />
            </div>

            {/* Film strip bottom */}
            <div className="flex items-center gap-2 px-2 pb-2 pt-1.5 bg-film-warm overflow-hidden">
              {SPROCKETS.map((_, i) => (
                <div key={i} className="w-2 h-1.5 flex-shrink-0 bg-film-amber/35 rounded-sm" />
              ))}
            </div>

            {/* Caption */}
            <p className="mt-3 text-center text-[0.58rem] font-semibold tracking-[0.25em] uppercase text-film-gray-light/60">
              VideoForge — AI Video Generation Demo · 60 seconds
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
