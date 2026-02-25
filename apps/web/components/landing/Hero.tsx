'use client';
import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { VideoModal } from './VideoModal';

const FRAME_COUNT = 22;
const frames      = Array.from({ length: FRAME_COUNT });
const sprockets   = Array.from({ length: 140 });

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y       = useTransform(scrollYProgress, [0, 1],    ['0%', '30%']);
  const fadeOut = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <>
      <section ref={ref} className="relative min-h-screen overflow-hidden flex flex-col bg-film-black">

        {/* Subtle amber radial glow */}
        <div
          aria-hidden
          className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] pointer-events-none rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(232,197,71,0.05) 0%, transparent 68%)' }}
        />

        {/* Left-edge vertical rule — desktop only */}
        <div className="hidden md:block absolute left-14 top-20 bottom-36 w-px bg-film-border" aria-hidden />

        {/* ── Main content (parallax) ─────────────────────── */}
        <motion.div
          style={{ y, opacity: fadeOut }}
          className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 pt-24 sm:pt-28 pb-16 sm:pb-20 text-center"
        >
          {/* NOW SHOWING badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 mb-8 sm:mb-10"
          >
            <span className="h-px w-6 sm:w-10 bg-film-amber" />
            <span className="section-label animate-flicker">Now Showing — AI Video Generation</span>
            <span className="h-px w-6 sm:w-10 bg-film-amber" />
          </motion.div>

          {/* ── Headline block ──────────────────────────────── */}
          <div className="w-full max-w-6xl leading-none">

            {/* Line 1 — outlined ghost */}
            <motion.div
              initial={{ opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className="font-display block"
                style={{
                  fontSize: 'clamp(1.2rem, 5.5vw, 5.2rem)',
                  WebkitTextStroke: '1.5px rgba(176,168,158,0.4)',
                  color: 'transparent',
                  letterSpacing: '0.07em',
                  lineHeight: 1.1,
                }}
              >
                TURN ANY CONTENT INTO A
              </span>
            </motion.div>

            {/* Line 2 — PROFESSIONAL giant outlined amber */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className="font-display block"
                style={{
                  fontSize: 'clamp(2.2rem, 12vw, 13rem)',
                  WebkitTextStroke: '2.5px #E8C547',
                  color: 'transparent',
                  letterSpacing: '0.02em',
                  lineHeight: 0.92,
                }}
              >
                PROFESSIONAL
              </span>
            </motion.div>

            {/* Line 3 — VIDEO AD (amber) + IN MINUTES (cream) */}
            <motion.div
              initial={{ opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.54, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-baseline justify-center gap-2 sm:gap-6 flex-wrap mt-1"
            >
              <span
                className="font-display text-film-amber"
                style={{ fontSize: 'clamp(1.9rem, 8.5vw, 8.5rem)', letterSpacing: '0.03em', lineHeight: 1 }}
              >
                VIDEO AD
              </span>
              <span
                className="font-display text-film-cream/55"
                style={{ fontSize: 'clamp(1.9rem, 8.5vw, 8.5rem)', letterSpacing: '0.03em', lineHeight: 1 }}
              >
                IN MINUTES
              </span>
            </motion.div>
          </div>

          {/* Italic serif subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.72 }}
            className="mt-7 sm:mt-9 font-serif italic text-base sm:text-xl text-film-gray-light max-w-lg leading-relaxed px-2 sm:px-0"
          >
            Paste a URL, upload a PDF, or just describe your product.{' '}
            <span className="text-film-cream/80 not-italic">We handle the rest.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none"
          >
            <Link
              href="/signup"
              className="btn-amber !py-4 !px-7 !text-[0.72rem] justify-center text-center"
            >
              → Create Your First Video Free
            </Link>
            <button
              onClick={() => setVideoOpen(true)}
              className="btn-ghost !py-4 !px-7 !text-[0.72rem] justify-center"
            >
              <span className="text-film-amber mr-1">▶</span>
              Watch 60-sec Demo
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="mt-10 sm:mt-12 flex items-center gap-4 sm:gap-8 flex-wrap justify-center"
          >
            {['⊡ 2,400+ Videos', '⊡ < 5 Min Render', '⊡ 30× Faster'].map((t, i) => (
              <span
                key={i}
                className="text-xs font-semibold tracking-[0.18em] uppercase text-film-gray-light"
              >
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Film strip ───────────────────────────────────── */}
        <div className="w-full bg-film-warm border-t border-film-border overflow-hidden select-none" aria-hidden>
          <div className="flex items-center gap-2.5 px-3 pt-2 pb-0.5">
            {sprockets.map((_, i) => (
              <div key={i} className="w-2 h-1.5 flex-shrink-0 bg-film-amber/30 rounded-sm" />
            ))}
          </div>
          <div className="marquee-container">
            <div className="marquee-track flex gap-0.5 py-1 px-0.5">
              {[...frames, ...frames].map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[5.5rem] h-[3.2rem] bg-film-black border border-film-border/50 flex items-end p-1"
                >
                  <span className="font-display text-film-amber/28 text-[0.58rem] leading-none">
                    {String((i % FRAME_COUNT) + 1).padStart(3, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 pt-0.5 pb-2">
            {sprockets.map((_, i) => (
              <div key={i} className="w-2 h-1.5 flex-shrink-0 bg-film-amber/30 rounded-sm" />
            ))}
          </div>
        </div>
      </section>

      {/* Video modal — outside section so it renders above everything */}
      <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </>
  );
}
